// File name: graphs.js
// Description: the graphs component contains n graph components and
// keeps them linked together. The highlighted points state is
// managed here.

// Copyright 2016 Planet Labs Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//   http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing permissions and
// limitations under the License.


import React from 'react';
import Graph from './graph';

import difference from 'lodash/difference';
import intersection from 'lodash/intersection';

import PropTypes from 'prop-types';
var maxPerArray = 65530;
var numBrushes = 6;

function unselectAll(columnLength, numBrushes) {
  var newBrushes = [];
  for (let i = 0; i < numBrushes; i++) {
    newBrushes.push([]);
  }

  var normalIndices = [];
  var i = 0;

  while (i < columnLength) {
    normalIndices.push(i % maxPerArray);

    i++;

    if (i % maxPerArray === 0 || i === columnLength) {
      newBrushes[0].push(new Uint16Array(normalIndices));
      normalIndices = [];

      for (let j = 1; j < numBrushes; j++) {
        let highlightedIndices = [];
        newBrushes[j].push(new Uint16Array(highlightedIndices));
      }
    }
  }
  return newBrushes;
}

class Graphs extends React.Component {
  state = {
    brushes: []
  };

  componentDidMount() {
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.state.brushes.length === 0) {
      if (this.props.columns.length === 0) {
        return;
      }

      var newBrushes = unselectAll(this.props.columns[0].length, numBrushes);
      this.setState({
        brushes: newBrushes
      });

    }
  };

  _invertSelection = () => {
    if (this.props.activeHighlight == 0) {
      return;
    }
    let brush = this.state.brushes[this.props.activeHighlight];
    let normal = this.state.brushes[0];

    let newBrushedPts = [];
    for (let i = 0; i < normal.length; i++) {
      let brushedPts = brush[i];
      let normalPts = normal[i];

      let unbrushedPts = difference(normalPts, brushedPts);
      newBrushedPts.push(new Uint16Array(unbrushedPts));
    }

    let newBrushes = [...this.state.brushes];

    newBrushes[this.props.activeHighlight] = newBrushedPts;

    this.setState({
      brushes: newBrushes
    });
  };

  _keydown = (event) => {
    switch (event.which) {
      case 73: // 'i' key: invert
        this._invertSelection();
        break;
      case 88: // 'x' key: delete
        // this._deleteHighlighted();
        break;

      default:
        break;
    }
  };

  _deleteHighlighted = () => {
    var totalHighlighted = 0;
    for (var a = 0; a < this.state.highlightedIndicesArrays.length; a++) {
      var highlightedIndices = this.state.highlightedIndicesArrays[a];
      totalHighlighted += highlightedIndices.length;
    }

    var newColumns = [];
    for (var c = 0; c < this.props.columns.length; c++) {
      var oldColumn = this.props.columns[c];
      var newColumn = [];
      for (var i = 0; i < this.state.normalIndicesArrays.length; i++) {
        var normalIndices = this.state.normalIndicesArrays[i];

        for (var j = 0; j < normalIndices.length; j++) {
          newColumn.push(oldColumn[normalIndices[j] + i * maxPerArray]);
        }
      }
      newColumns.push(newColumn);
    }

    var newIndices = unselectAll(newColumns[0].length);

    this.props.onColumnsChanged(newColumns);
    this.setState({
      normalIndicesArrays: newIndices[0],
      highlightedIndicesArrays: newIndices[1]
    })
  };

  _findSelectedIndices = (ptArrays, xDown, xUp, yDown, yUp) => {
    if (this.props.activeHighlight == 0) {
      return;
    }

    var xMin = Math.min(xDown, xUp);
    var xMax = Math.max(xDown, xUp);

    var yMin = Math.min(yDown, yUp);
    var yMax = Math.max(yDown, yUp);

    var highlightedIndicesArrays = [];

    var nCounts = 0;
    var hCounts = 0;

    for (let i = 0; i < ptArrays.length; i++) {
      var pts = ptArrays[i];
      var normalIndices = [];
      var highlightedIndices = [];

      for (let j = 0; j < pts.length; j += 2) {
        var x = pts[j];
        var y = pts[j + 1];

        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          highlightedIndices.push(j / 2);
          hCounts++;
        }
        else {
          normalIndices.push(j / 2);
          nCounts++;
        }
      }
      highlightedIndicesArrays.push(highlightedIndices);
    }

    let andBucket = [];

    if (this.props.activeHighlight == 5) {
      andBucket = this.state.brushes[this.props.purpleBrushOverIndex];
    }

    if (this.props.activeHighlight == 4) {
      andBucket = this.state.brushes[this.props.tealBrushOverIndex];
    }

    if (this.props.activeHighlight == 3) {
      andBucket = this.state.brushes[this.props.yellowBrushOverIndex];
    }

    if (this.props.activeHighlight == 2) {
      andBucket = this.state.brushes[this.props.greenBrushOverIndex];
    }

    if (this.props.activeHighlight >= 2) {
      for (let i = 0; i < andBucket.length; i++) {
        let subAndBucket = andBucket[i];
        let subHighlighted = highlightedIndicesArrays[i];

        let intersect = intersection(subAndBucket, subHighlighted);

        highlightedIndicesArrays[i] = intersect;
      }
    }

    for (let i = 0; i < highlightedIndicesArrays.length; i++) {
      highlightedIndicesArrays[i] = new Uint16Array(highlightedIndicesArrays[i]);
    }

    let newBrushes = [];
    for (let b = 0; b < this.state.brushes.length; b++) {
      newBrushes.push(this.state.brushes[b]);
    }
    newBrushes[this.props.activeHighlight] = highlightedIndicesArrays;

    this.setState({
      brushes: newBrushes
    });
  };

  render() {

    if (!this.props.columns || !this.props.options) {
      return null;
    }

    var rows = [];
    for (var i = 0; i < this.props.count; i++) {
      var rowIndex = this.props.count > 2 ?
          Math.round(i / this.props.count) : 0;
      if (!rows[rowIndex]) {
        rows[rowIndex] = [];
      }
      rows[rowIndex].push(
        <Graph
            brushes={this.state.brushes}
            axesClassName={this.props.axesClassName}
            className={this.props.graphClassName}
            columns={this.props.columns}
            enums={this.props.enums}
            highlightFunction={this._findSelectedIndices}
            key={i}
            options={this.props.options}
            overpaintFactor={this.props.overpaintFactor}
            pointSize={this.props.pointSize}
            uid={i}/>
      );
    }


    return (
      <div className={this.props.className || 'vp-graphs'}>
        {rows.length && rows.map((graphs, index) => {
          return (
            <div className={this.props.rowClassName || 'vp-graphs-row'}
                key={index}>
              {graphs}
            </div>
          );
        })}
      </div>
    );
  };
};

// module.exports = Graphs;


Graphs.propTypes = {
  activeHighlight: PropTypes.number,
  axesClassName: PropTypes.string,
  className: PropTypes.string,
  columns: PropTypes.array,
  count: PropTypes.number,
  enums: PropTypes.array,
  graphClassName: PropTypes.string,
  greenBrushOverIndex: PropTypes.number,
  onColumnsChanged: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.string),
  overpaintFactor: PropTypes.number,
  pointSize: PropTypes.number,
  rowClassName: PropTypes.string,
  viewportClassName: PropTypes.string,
  yellowBrushOverIndex: PropTypes.number,
  tealBrushOverIndex: PropTypes.number,
  purpleBrushOverIndex: PropTypes.number
};

export default Graphs;
