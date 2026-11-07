export * from '../design';
import type * as Design from '../design';

type ComponentName = 'Icon' | 'Button' | 'IconButton' | 'Toolbar' | 'TextField' | 'TagInput' | 'PanelSection' | 'ProjectTree' | 'DocTabs' | 'ContextMenu' | 'ModuleCard' | 'TextModule' | 'NumberModule' | 'AxisModule' | 'RadarModule' | 'BooleanModule' | 'ModuleList' | 'ArchiveHeader' | 'ReferenceList' | 'PresetLibrary' | 'CanvasNode' | 'RelationCanvas' | 'SnapshotHistory' | 'Dialog' | 'StatusBar';
declare const TTool: Pick<typeof Design, ComponentName>;
export default TTool;
