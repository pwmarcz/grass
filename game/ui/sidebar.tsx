import { Component, ComponentChild, h, VNode } from 'preact';
import { TILES } from '../tiles';
import { TILE_SIZE } from './textures';
import { Item, ItemType } from '../item';

export interface ItemInfo {
  tile: string;
  count: number;
}

export interface SidebarState {
  health: number;
  maxHealth: number;
  inventory: ItemInfo[];
  terrainTile: string | null;
  mobTile: string | null;
  items: ItemInfo[] | null;
}

export class Sidebar extends Component<{}, SidebarState> {
  constructor() {
    super();
    this.state = {
      health: 100,
      maxHealth: 100,
      inventory: [],
      terrainTile: null,
      mobTile: null,
      items: null,
    };
  }

  render(props: {}, state: SidebarState): ComponentChild {
    const {
      health,
      maxHealth,
      inventory,
      terrainTile,
      mobTile,
      items
    } = state;

    return (
      <div id="info">
        <section>
          <h2>Stats:</h2>
          <div class="stat">
            <label>Health:</label>
            <StatBar value={health} max={maxHealth}/>
          </div>
        </section>
        <section>
          <h2>Inventory:</h2>
          <div class="item-list">
            {inventory.map(item => <TileRow tile={item.tile} count={item.count} />)}
          </div>
        </section>
        <section>
          <h2>Highlighted:</h2>
          <div class="item-list">
            {terrainTile && <TileRow tile={terrainTile}/>}
            {mobTile && <TileRow tile={mobTile}/>}
            {items && items.map(item =>
              <TileRow tile={item.tile} count={item.count}/>)}
          </div>
        </section>
      </div>
    );
  }
}

interface StatBarProps {
  value: number;
  max: number;
}

function StatBar({value, max}: StatBarProps): VNode {
  const width = Math.round(100 * value / max) + '%';

  return (
    <span class="bar">
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

  return h('span', {
    className: 'tile',
    style: {
      backgroundPositionX: -x + 'px',
      backgroundPositionY: -y + 'px',
    }
  });
}

export function compactItems(items: Item[]): ItemInfo[] {
  const result = [];
  const infos: Partial<Record<ItemType, ItemInfo>> = {};

  for (const item of items) {
    const prev = infos[item.type];
    if (prev) {
      prev.count++;
    } else {
      const info = { tile: item.tile(), count: 1};
      infos[item.type] = info;
      result.push(info);
    }
  }

  return result;
}
