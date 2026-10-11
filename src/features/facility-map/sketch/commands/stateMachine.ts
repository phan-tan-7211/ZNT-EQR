import type {
  SketchCommandState,
  SketchInteraction,
  SketchTool,
} from '../core/types';

export function createSketchCommandState(tool: SketchTool = 'select'): SketchCommandState {
  return { tool, interaction: 'idle' };
}

export function selectSketchTool(
  state: SketchCommandState,
  tool: SketchTool,
): SketchCommandState {
  return {
    tool,
    interaction: 'idle',
  };
}

export function beginSketchInteraction(
  state: SketchCommandState,
  interaction: Exclude<SketchInteraction, 'idle'>,
): SketchCommandState {
  return {
    ...state,
    interaction,
  };
}

export function endSketchInteraction(state: SketchCommandState): SketchCommandState {
  return {
    ...state,
    interaction: 'idle',
  };
}
