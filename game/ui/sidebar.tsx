import { Component, ComponentChild, h, VNode } from 'preact';
import { TileElement } from '../tiles';

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
          {inventory.map(itemTile => <TileRow tile={itemTile} />)}
        </section>
        <section>
          <h2>Highlighted:</h2>
          {terrainTile && <TileRow tile={terrainTile}/>}
          {mobTile && <TileRow tile={mobTile}/>}
          {itemTiles && itemTiles.map(itemTile =>
            <TileRow tile={itemTile}/>)}
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
      <TileElement tile={tile} />
      <span class="desc">{desc}</span>
    </div>
  );
}
