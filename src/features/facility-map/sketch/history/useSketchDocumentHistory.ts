import { useCallback, useEffect, useMemo, useState } from 'react';
import { cloneSketchDocument, touchSketchDocument } from '../core/document';
import type { SketchDocument } from '../core/types';
import {
  beginSketchHistoryTransaction,
  cancelSketchHistoryTransaction,
  commitSketchHistory,
  commitSketchHistoryTransaction,
  createSketchHistory,
  redoSketchHistory,
  undoSketchHistory,
  updateSketchHistoryTransient,
} from './history';
import { loadSketchDocument, saveSketchDocument } from '../persistence/storage';

type DocumentUpdater =
  | SketchDocument
  | ((current: SketchDocument) => SketchDocument);

const resolveUpdater = (
  current: SketchDocument,
  updater: DocumentUpdater,
): SketchDocument =>
  typeof updater === 'function'
    ? (updater as (value: SketchDocument) => SketchDocument)(current)
    : updater;

type SketchDocumentHistoryOptions = {
  initialDocument?: SketchDocument;
  sessionKey?: number | string;
  onChange?: (document: SketchDocument) => void;
  /**
   * Runs on every document that becomes `present` — committed, transient
   * (live drag), or transaction-finalized. This is the single choke point
   * all sketch edits pass through, so it's where constraint solving is
   * wired in: entities always reflect the solved geometry rather than the
   * raw, possibly constraint-violating edit. `previous` is the document the
   * edit started from, so the solver can tell what the user just changed.
   */
  postProcess?: (document: SketchDocument, previous?: SketchDocument) => SketchDocument;
};

export function useSketchDocumentHistory(
  storageKey: string,
  options: SketchDocumentHistoryOptions = {},
) {
  const { initialDocument, sessionKey, onChange, postProcess } = options;
  const applyPostProcess = useCallback(
    (document: SketchDocument, previous?: SketchDocument): SketchDocument =>
      postProcess ? postProcess(document, previous) : document,
    [postProcess],
  );
  const resolveInitialDocument = useCallback(
    () => initialDocument
      ? cloneSketchDocument(initialDocument)
      : loadSketchDocument(storageKey),
    [initialDocument, storageKey],
  );
  const [history, setHistory] = useState(() =>
    createSketchHistory(
      resolveInitialDocument(),
      cloneSketchDocument,
    ),
  );

  useEffect(() => {
    setHistory(
      createSketchHistory(
        resolveInitialDocument(),
        cloneSketchDocument,
      ),
    );
  }, [resolveInitialDocument, sessionKey]);

  useEffect(() => {
    saveSketchDocument(storageKey, history.present);
    onChange?.(cloneSketchDocument(history.present));
  }, [history.present, onChange, storageKey]);

  const commit = useCallback((updater: DocumentUpdater) => {
    setHistory((current) => {
      const next = touchSketchDocument(
        applyPostProcess(resolveUpdater(current.present, updater), current.present),
      );
      return commitSketchHistory(current, next, cloneSketchDocument);
    });
  }, [applyPostProcess]);

  const beginTransaction = useCallback(() => {
    setHistory((current) =>
      beginSketchHistoryTransaction(current, cloneSketchDocument),
    );
  }, []);

  const updateTransient = useCallback((updater: DocumentUpdater) => {
    setHistory((current) => {
      const next = applyPostProcess(resolveUpdater(current.present, updater), current.present);
      return updateSketchHistoryTransient(current, next, cloneSketchDocument);
    });
  }, [applyPostProcess]);

  const commitTransaction = useCallback(() => {
    setHistory((current) =>
      commitSketchHistoryTransaction(
        {
          ...current,
          present: touchSketchDocument(applyPostProcess(current.present, current.present)),
        },
        cloneSketchDocument,
      ),
    );
  }, [applyPostProcess]);

  const cancelTransaction = useCallback(() => {
    setHistory((current) =>
      cancelSketchHistoryTransaction(current, cloneSketchDocument),
    );
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => undoSketchHistory(current, cloneSketchDocument));
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => redoSketchHistory(current, cloneSketchDocument));
  }, []);

  return useMemo(() => ({
    document: history.present,
    commit,
    beginTransaction,
    updateTransient,
    commitTransaction,
    cancelTransaction,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    inTransaction: history.transactionStart !== null,
  }), [
    beginTransaction,
    cancelTransaction,
    commit,
    commitTransaction,
    history.future.length,
    history.past.length,
    history.present,
    history.transactionStart,
    redo,
    undo,
    updateTransient,
  ]);
}
