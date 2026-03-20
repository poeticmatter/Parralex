import { solve } from './solver';
import { LevelData } from '../types';

self.onmessage = (e: MessageEvent<LevelData>) => {
  const result = solve(e.data);
  self.postMessage(result);
};
