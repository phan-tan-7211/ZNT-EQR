// Side-effect entry: imported first by main.tsx so browser data written under
// the previous key prefix is moved before any other module reads storage.
import { runLegacyStorageMigration } from '@/lib/legacyStorageMigration';

runLegacyStorageMigration();
