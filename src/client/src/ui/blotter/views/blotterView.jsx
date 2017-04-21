import React from 'react';
import {Table, Column, Cell} from 'fixed-data-table';
import {DateCell, NotionalCell} from './';
import {TradeRow} from '../../../services/model';
import {logger} from '../../../system';
import classNames from 'classnames';
import SizeMe from 'react-sizeme';
import 'fixed-data-table/dist/fixed-data-table.css';
import './blotter.scss';
import Hypergrid from 'fin-hypergrid/src/Hypergrid';

class BlotterView extends React.Component {
  static propTypes = {
    model: React.PropTypes.object.isRequired,
    router: React.PropTypes.object.isRequired,
    // passed by SizeMe :
    size: React.PropTypes.shape({
      width: React.PropTypes.number.isRequired,
      height: React.PropTypes.number.isRequired,
    })
  };

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    const theme = {
      backgroundColor: 'white',
      color: '#1d2027',
      columnHeaderBackgroundColor: '#e1e3e8',
      columnHeaderColor: '#1d2027',
      gridLinesH: true,
      gridLinesV: false,
      lineColor: '#e1e3e8',
      font: '14px BrandonMedium',
      columnHeaderFont: '12px BrandonMedium',
      defaultRowHeight: 32,
      foregroundSelectionColor: '#1d2027',
      backgroundSelectionColor: 'white',
      selectionRegionOutlineColor: 'transparent',
      columnHeaderForegroundSelectionColor: '#1d2027',
      columnHeaderBackgroundSelectionColor: '#e1e3e8'
    };
    const defaultProperties = {
      showRowNumbers: false,
      showFilterRow: false,
      defaultColumnWidth: 100,
      columnAutosizing: false,
      hoverColumnHighlight: {
        enabled: false
      },
      hoverRowHighlight: {
        enabled: true,
        backgroundColor: '#fffed7'
      },
      hoverCellHighlight: {
        enabled: false
      }
    };
    const notionalCalculator = trade => {
      const formatter = new this.grid.localization.NumberFormatter('en-GB');
      return `${formatter.format(trade.notional)} ${trade.currencyPair.base}`;
    };
    this.grid = new Hypergrid(this.refs.hypergrid, { data: [], schema: [
      {
        name: 'tradeId', header: 'Id'
      }, {
        name: 'tradeDate', header: 'Date'
      }, {
        name: 'direction', header: 'Direction'
      }, {
        name: 'currencyPair', header: 'CCYCCY'
      }, {
        name: 'notional', header: 'Notional', calculator: notionalCalculator
      }, {
        name: 'spotRate', header: 'Rate'
      }, {
        name: 'status', header: 'Status'
      }, {
        name: 'valueDate', header: 'Value Date'
      }, {
        name: 'traderName', header: 'Trader'
      }]
    });
    const idx = this.grid.behavior.columnEnum;
    this.grid.addProperties(theme);
    this.grid.addProperties(defaultProperties);
    this.grid.behavior.setColumnProperties(idx.TRADE_ID, {
      width: 50
    });
    this.grid.behavior.setColumnProperties(idx.TRADE_DATE, {
      format: 'date',
      width: 150,
      halign: 'right'
    });
    this.grid.behavior.setColumnProperties(idx.DIRECTION, {
      format: 'direction',
      halign: 'left'
    });
    this.grid.behavior.setColumnProperties(idx.CURRENCY_PAIR, {
      format: 'currencyPair',
      halign: 'left'
    });
    this.grid.behavior.setColumnProperties(idx.NOTIONAL, {
      width: 200,
      halign: 'right'
    });
    this.grid.behavior.setColumnProperties(idx.STATUS, {
      format: 'status',
      halign: 'left'
    });
    this.grid.behavior.setColumnProperties(idx.VALUE_DATE, {
      format: 'date'
    });
    this.grid.behavior.setColumnProperties(idx.TRADER_NAME, {
      halign: 'left'
    });
    this.grid.localization.add('date', new this.grid.localization.DateFormatter('en-GB'));
    this.grid.localization.add('direction', {
      format: direction => direction.name.toUpperCase(),
      parse: str => str
    });
    this.grid.localization.add('currencyPair', {
      format: currencyPair => currencyPair.symbol,
      parse: str => str
    });
    this.grid.localization.add('status', {
      format: status => status.name,
      parse: str => str
    });
    this.grid.localization.add('valueDate', {
      format: valueDate => valueDate,
      parse: str => str
    });
  }

  render() {
    let model = this.props.model;
    let className = classNames(
      'blotter', {
        'blotter--online': model.isConnected,
        'blotter--offline': !model.isConnected
      });
    let newWindowClassName = classNames(
      'glyphicon glyphicon-new-window',
      {
        'blotter__controls--hidden': model.canPopout
      }
    );
    if (this.grid) {
      this.grid.behavior.setData(model.trades.map(x => x.trade));
    }
    let { width, height } = this.props.size;
    const styles = {
      width: `${width}px`,
      height: `${height}px`
    };

    return (
      <div className={className}>
        <div className='blotter-wrapper'>
          <div className='blotter__controls popout__controls'>
            <i className={newWindowClassName}
               onClick={() => this.props.router.publishEvent(model.modelId, 'tearOffBlotter', {})}/>
          </div>
          <div ref='hypergrid' style={styles}></div>
        </div>
      </div>
    );
  }

}

export default SizeMe({monitorHeight: true})(BlotterView);
