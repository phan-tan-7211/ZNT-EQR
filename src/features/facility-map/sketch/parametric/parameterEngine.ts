import type { SketchParameter } from '../core/types';
import {
  evaluateExpression,
  type ExpressionValue,
} from './expression';

export type ParameterGraph = Map<string, Set<string>>;

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const buildParameterGraph = (
  parameters: SketchParameter[],
): ParameterGraph => {
  const names = new Set(parameters.map((parameter) => parameter.name));
  const graph: ParameterGraph = new Map();

  parameters.forEach((parameter) => {
    const result = evaluateExpression(parameter.expression, {
      mmPerUnit: 1,
      parameters: Object.fromEntries(
        [...names].map((name) => [
          name,
          { value: 1, dimension: 'scalar' as const },
        ]),
      ),
    });
    graph.set(
      parameter.name,
      new Set(result.references.filter((name) => names.has(name))),
    );
  });

  return graph;
};

export const findParameterCycles = (
  graph: ParameterGraph,
): string[][] => {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const seenKeys = new Set<string>();

  const visit = (name: string) => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      const start = stack.indexOf(name);
      const cycle = [...stack.slice(start), name];
      const normalized = cycle.slice(0, -1).sort().join('|');
      if (!seenKeys.has(normalized)) {
        seenKeys.add(normalized);
        cycles.push(cycle);
      }
      return;
    }

    visiting.add(name);
    stack.push(name);
    graph.get(name)?.forEach(visit);
    stack.pop();
    visiting.delete(name);
    visited.add(name);
  };

  graph.forEach((_, name) => visit(name));
  return cycles;
};

export const recalculateParameters = (
  parameters: SketchParameter[],
  mmPerUnit: number,
): SketchParameter[] => {
  const duplicateNames = new Set<string>();
  const seen = new Set<string>();
  parameters.forEach((parameter) => {
    if (seen.has(parameter.name)) duplicateNames.add(parameter.name);
    seen.add(parameter.name);
  });

  const graph = buildParameterGraph(parameters);
  const cycles = findParameterCycles(graph);
  const cycleNames = new Set(cycles.flat());
  const byName = new Map(parameters.map((parameter) => [parameter.name, parameter]));
  const cache = new Map<string, ExpressionValue>();
  const evaluating = new Set<string>();

  const evaluateParameter = (name: string): ExpressionValue | null => {
    if (cache.has(name)) return cache.get(name)!;
    if (cycleNames.has(name) || duplicateNames.has(name)) return null;
    const parameter = byName.get(name);
    if (!parameter || evaluating.has(name)) return null;

    evaluating.add(name);
    const context: Record<string, ExpressionValue> = {};

    for (const dependency of graph.get(name) ?? []) {
      const value = evaluateParameter(dependency);
      if (value) context[dependency] = value;
    }

    const result = evaluateExpression(parameter.expression, {
      mmPerUnit,
      parameters: context,
    });
    evaluating.delete(name);

    if (!result.ok) return null;
    cache.set(name, result.result);
    return result.result;
  };

  return parameters.map((parameter) => {
    if (!NAME_PATTERN.test(parameter.name)) {
      return {
        ...parameter,
        value: undefined,
        dimension: undefined,
        error: 'Invalid parameter name',
      };
    }
    if (duplicateNames.has(parameter.name)) {
      return {
        ...parameter,
        value: undefined,
        dimension: undefined,
        error: 'Duplicate parameter name',
      };
    }
    if (cycleNames.has(parameter.name)) {
      return {
        ...parameter,
        value: undefined,
        dimension: undefined,
        error: 'Cyclic dependency',
      };
    }

    const context: Record<string, ExpressionValue> = {};
    for (const dependency of graph.get(parameter.name) ?? []) {
      const value = evaluateParameter(dependency);
      if (value) context[dependency] = value;
    }

    const result = evaluateExpression(parameter.expression, {
      mmPerUnit,
      parameters: context,
    });
    if (!result.ok) {
      return {
        ...parameter,
        value: undefined,
        dimension: undefined,
        error: result.error,
      };
    }

    cache.set(parameter.name, result.result);
    return {
      ...parameter,
      value: result.result.value,
      dimension: result.result.dimension,
      error: undefined,
    };
  });
};

export const getParameterDependents = (
  parameters: SketchParameter[],
  name: string,
): string[] => {
  const graph = buildParameterGraph(parameters);
  return parameters
    .filter((parameter) => graph.get(parameter.name)?.has(name))
    .map((parameter) => parameter.name);
};

const replaceIdentifier = (
  expression: string,
  oldName: string,
  newName: string,
): string =>
  expression.replace(
    new RegExp('\\b' + oldName + '\\b', 'g'),
    newName,
  );

export const renameParameter = (
  parameters: SketchParameter[],
  oldName: string,
  newName: string,
): SketchParameter[] => {
  if (!NAME_PATTERN.test(newName)) {
    throw new Error('Invalid parameter name');
  }
  if (
    parameters.some(
      (parameter) =>
        parameter.name === newName && parameter.name !== oldName,
    )
  ) {
    throw new Error('Duplicate parameter name');
  }

  return parameters.map((parameter) => ({
    ...parameter,
    name: parameter.name === oldName ? newName : parameter.name,
    expression: replaceIdentifier(
      parameter.expression,
      oldName,
      newName,
    ),
  }));
};

export const canDeleteParameter = (
  parameters: SketchParameter[],
  name: string,
): { ok: true } | { ok: false; dependents: string[] } => {
  const dependents = getParameterDependents(parameters, name);
  return dependents.length
    ? { ok: false, dependents }
    : { ok: true };
};
