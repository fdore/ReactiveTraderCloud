import Rx from 'rx';
import { Connection, ServiceBase } from '../system/service';
import { AnalyticsRequest, PositionUpdates, ServiceConst } from './model';
import { PositionsMapper } from './mappers';
import { Guard, logger, SchedulerService, RetryPolicy } from '../system';
import { ReferenceDataService } from './';
import { inject } from 'aurelia-dependency-injection';

var _log:logger.Logger = logger.create('AnalyticsService');

@inject(Connection, SchedulerService, PositionsMapper)
export default class AnalyticsService extends ServiceBase {

  constructor(connection:Connection, schedulerService:SchedulerService, positionsMapper:PositionsMapper) {
    super(ServiceConst.AnalyticsServiceKey, connection, schedulerService);
    this._positionsMapper = positionsMapper;
  }

  getAnalyticsStream(analyticsRequest:AnalyticsRequest):Rx.Observable<PositionUpdates> {
    Guard.isDefined(analyticsRequest, 'analyticsRequest required');
    let _this = this;
    return Rx.Observable.create(
      o => {
        _log.debug('Subscribing to analytics stream');
        return _this._serviceClient
          .createStreamOperation('getAnalytics', analyticsRequest)
          .retryWithPolicy(RetryPolicy.backoffTo10SecondsMax, 'getAnalytics', _this._schedulerService.async)
          .select(dto => _this._positionsMapper.mapFromDto(dto))
          .subscribe(o);
      }
    );
  }
}
