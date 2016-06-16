import Rx from 'rx';
import { TradeMapper } from './mappers';
import { Connection, ServiceBase } from '../system/service';
import { logger, SchedulerService, RetryPolicy } from '../system';
import { TradesUpdate, ServiceConst } from '../services/model';
import { inject } from 'aurelia-dependency-injection';

var _log:logger.Logger = logger.create('BlotterService');

@inject(Connection, SchedulerService, TradeMapper)
export default class BlotterService extends ServiceBase {

  constructor(connection:Connection,
              schedulerService:SchedulerService,
              tradeMapper:TradeMapper) {
    super(ServiceConst.BlotterServiceKey, connection, schedulerService);
    this._tradeMapper = tradeMapper;
  }

  getTradesStream() : Rx.Observable<TradesUpdate> {
    let _this = this;
    return Rx.Observable.create(
      o => {
        _log.debug('Subscribing to trade stream');
        return _this._serviceClient
          .createStreamOperation('getTradesStream', {/* noop request */ })
          .retryWithPolicy(RetryPolicy.backoffTo10SecondsMax, 'getTradesStream', _this._schedulerService.async)
          .map(dto => _this._tradeMapper.mapFromDto(dto))
          .subscribe(o);
      }
    );
  }
}
