import { Component, ComponentChild, h, VNode } from 'preact';
import { TILES } from '../tiles';
import { TILE_SIZE } from './textures';

export interface SidebarState {
  inventory: string[];
  terrainTile: string | null;
  mobTile: string | null;
  itemTiles: string[] | null;
}

export class Sidebar extends Component<{}, SidebarState> {
  constructor() {
    super();
    this.state = {
      inventory: [],
      terrainTile: null,
      mobTile: null,
      itemTiles: null,
    };
  }

  render(props: {}, state: SidebarState): ComponentChild {
    const { inventory, terrainTile, mobTile, itemTiles } = state;

    return (
      <div id="info">
        <section>
          <h2>Inventory:</h2>
          <div class="item-list">
            {inventory.map(itemTile => <TileRow tile={itemTile} />)}
          </div>
        </section>
        <section>
          <h2>Highlighted:</h2>
          <div class="item-list">
            {terrainTile && <TileRow tile={terrainTile}/>}
            {mobTile && <TileRow tile={mobTile}/>}
            {itemTiles && itemTiles.map(itemTile =>
              <TileRow tile={itemTile}/>)}
          </div>
        </section>
      </div>
    );
  }
}


interface TileRowProps {
  tile: string;
}

function TileRow({tile}: TileRowProps): VNode {
  const desc = tile.toLowerCase();
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