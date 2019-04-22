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
    return h('div', {id: 'info'},
      h('section', null,
        h('h2', null, 'Inventory:'),
        inventory.map(itemTile =>
          h(TileRow, { tile: itemTile, desc: itemTile.toLowerCase() })),
      ),
      h('section', null,
        h('h2', null, 'Highlighted:'),
        terrainTile && h(TileRow, {tile: terrainTile, desc: terrainTile.toLowerCase()}),
        mobTile && h(TileRow, {tile: mobTile, desc: mobTile.toLowerCase()}),
        itemTiles && itemTiles.map(itemTile =>
          h(TileRow, { tile: itemTile, desc: itemTile.toLowerCase() })),
      ),
    );
  }
}

interface TileRowProps {
  tile: string;
  desc: string;
}

function TileRow({tile, desc}: TileRowProps): VNode {
  return h('div', {class: 'tile-row'},
    h(TileElement, {tile}),
    h('span', {class: 'desc'}, desc),
  );
}
