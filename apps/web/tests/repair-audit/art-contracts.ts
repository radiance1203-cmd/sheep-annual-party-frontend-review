import type {GameId,GameView,RawInput} from '@sheep/game-core';
export interface ArtTrajectory {id:string;game:GameId;inputs:RawInput[];endTick:number;provenance:string;inputHash:string;finalStateHash:string}
export interface ArtCase {id:string;trajectory:string;game:GameId;tick:number;view:GameView;viewHash:string;stateHash:string;prefixHash:string;primary:boolean;features:Record<string,string|number|boolean>}
export interface ArtCatalog {createdAt:string;scope:string;build:unknown;rulesFileHash:string;trajectories:ArtTrajectory[];cases:ArtCase[]}
