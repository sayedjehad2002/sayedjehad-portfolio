import type { SceneConfig, SceneId } from '../types';
import { plaza } from './plaza';
import { studio } from './studio';

export const SCENES: Record<SceneId, SceneConfig> = { plaza, studio };
