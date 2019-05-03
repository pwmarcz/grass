import { Component, ComponentChild, h, VNode } from 'preact';
import { TILES } from '../tiles';
import { TILE_SIZE } from './textures';
import { Item, ItemType } from '../item';
import { Mob } from '../mob';

export interface ItemInfo {
  tile: string;
  count: number;
}

export interface MobInfo {
  tile: string;
  health: number;
  maxHealth: number;
}

export interface SidebarState {
  health: number;
  maxHealth: number;
  inventory: ItemInfo[];
  terrainTile: string | null;
  mob: MobInfo | null;
  items: ItemInfo[] | null;

  enemy: MobInfo | null;
}

export class Sidebar extends Component<{}, SidebarState> {
  constructor() {
    super();
    this.state = {
      health: 100,
      maxHealth: 100,
      inventory: [],
      terrainTile: null,
      mob: null,
      items: null,
      enemy: null,
    };
  }

  render(props: {}, state: SidebarState): ComponentChild {
    const {
      health,
      maxHealth,
      inventory,
      terrainTile,
      mob,
      items,
      enemy,
    } = state;

    return (
      <div id="info">
        <section>
          <h2>Stats:</h2>
          <div class="stat">
            <label>Health:</label>
            <StatBar value={health} max={maxHealth} color />
          </div>
        </section>
        <section>
          <h2>Inventory:</h2>
          <div class="item-list">
            {inventory.map(item => <TileRow tile={item.tile} count={item.count} />)}
          </div>
        </section>
        <section class="highlighted">
          <h2>Highlighted:</h2>
          <div class="item-list">
            {terrainTile && <TileRow tile={terrainTile}/>}
            {items && items.map(item =>
              <TileRow tile={item.tile} count={item.count}/>)}
            {mob && <MobRow mob={mob}/>}
          </div>
        </section>
        {enemy && (
          <section>
            <h2>Enemy:</h2>
            <MobRow mob={enemy}/>
          </section>
        )}
      </div>
    );
  }
}

interface StatBarProps {
  value: number;
  max: number;
  color?: boolean;
}

function StatBar({value, max, color}: StatBarProps): VNode {
  const part = value / max;
  const width = Math.round(100 * part) + '%';

  let cls = '';

  if (color) {
    if (part <= 0.25) {
      cls = 'critical';
    } else if (part <= 0.5) {
      cls = 'warning';
    } else {
      cls = 'normal';
    }
  }

  return (
    <span class={'bar ' + cls}>
      <span class="inner" style={{width}}>
        {value}/{max}
      </span>
    </span>
  );
}

interface TileRowProps {
  tile: string;
  count?: number;
}

function TileRow({tile, count}: TileRowProps): VNode {
  let desc = tile.toLowerCase();
  if (count !== undefined && count > 1) {
    desc = `${desc} (${count})`;
  }
  return (
    <div class="tile-row">
      <Tile tile={tile} />
      <span class="desc">{desc}</span>
    </div>
  );
}

function Tile({tile}: { tile: string }): preact.VNode {
  const id = TILES[tile].id;
  const x = (id % 10) * TILE_SIZE, y = Math.floor(id / 10) * TILE_SIZE;

  let className = 'tile';
  const style: Record<string, string> = {
    backgroundPositionX: -x + 'px',
    backgroundPositionY: -y + 'px',
  };

  const tint = TILES[tile].tint;
  if (tint) {
    className = 'tile tinted';
    const color = PIXI.utils.hex2string(tint);
    style.filter = `drop-shadow(32px 0px ${color})`;
  }

  return h('span', {
    className
  },
  h('span', {
    className: 'inner',
    style
  }));
}

export function describeItems(items: Item[]): ItemInfo[] {
  const result = [];
  const infos: Partial<Record<ItemType, ItemInfo>> = {};

  for (const item of items) {
    const prev = infos[item.type];
    if (prev) {
      prev.count++;
    } else {
      const info = { tile: item.tile, count: 1};
      infos[item.type] = info;
      result.push(info);
    }
  }

  return result;
}

export function describeMob(mob: Mob | null): MobInfo | null {
  if (!mob) {
    return null;
  }
  return {
    tile: mob.tile,
    health: mob.health,
    maxHealth: mob.maxHealth,
  };
}

function MobRow({ mob }: { mob: MobInfo }): VNode {
  return (
    <div>
      <TileRow tile={mob.tile} />
      {mob.health < mob.maxHealth && (
        <div class="stat">
          <label>Health:</label>
          <StatBar value={mob.health} max={mob.maxHealth}/>
        </div>
      )}
    </div>
  );
}
