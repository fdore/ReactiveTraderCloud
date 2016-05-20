import { Router,  observeEvent } from 'esp-js/src';
import { AnalyticsService } from '../../../services';
import { ServiceStatus } from '../../../system/service';
import { logger } from '../../../system';
import { ModelBase, RegionManagerHelper } from '../../common';
import { RegionManager, RegionNames, view  } from '../../regions';
import { PnlChartModel, PositionsChartModel, ChartModelBase } from './';
import {
  AnalyticsRequest,
  PositionUpdates,
} from '../../../services/model';
import { AnalyticsView } from '../views';
import { OpenFin } from '../../../system/openFin';

var _log:logger.Logger = logger.create('AnalyticsModel');

@view(AnalyticsView)
export default class AnalyticsModel extends ModelBase {
  _analyticsService:AnalyticsService;
  _positionsChartModel:PositionsChartModel;
  _pnlChartModel:PnlChartModel;
  _regionManagerHelper:RegionManagerHelper;
  _openFin:OpenFin;
  _regionManager:RegionManager;
  _regionName:string;
  isAnalyticsServiceConnected: Boolean;

  constructor(
    modelId:string,
    router:Router,
    analyticsService:AnalyticsService,
    regionManager:RegionManager,
    openFin:OpenFin
  ) {
    super(modelId, router);
    this._analyticsService = analyticsService;
    this._regionName = RegionNames.quickAccess;
    this.isAnalyticsServiceConnected = false;
    this._pnlChartModel = new PnlChartModel();
    this._positionsChartModel = new PositionsChartModel();
    this._openFin = openFin;
    this._regionManager = regionManager;
    this._regionManagerHelper = new RegionManagerHelper(this._regionName, regionManager, this);
  }

  get positionsChartModel() {
    return this._positionsChartModel;
  }

  get pnlChartModel() {
    return this._pnlChartModel;
  }

  observeEvents() {
    super.observeEvents();
    this.addDisposable(this.router.observeEventsOn(this._modelId, this._positionsChartModel));
  }

  @observeEvent('init')
  _onInit() {
    _log.info(`Analytics model starting`);
    this._subscribeToConnectionStatus();
    this._regionManagerHelper.addToRegion();

    if (this._regionManager.shouldPopoutFromRegion(this._regionName, this._modelId)) {
      this.router.publishEvent(this._modelId, 'popOutAnalytics', {});
    }
  }

  @observeEvent('referenceDataLoaded')
  _onReferenceDataLoaded() {
    _log.info(`Ref data loaded, subscribing to analytics stream`);
    this._subscribeToAnalyticsStream();
  }

  @observeEvent('popOutAnalytics')
  _onPopOutAnalytics() {
    _log.info(`Popping out analytics`);
    this._regionManagerHelper.popout('Analytics', 400, 800);
  }

  _subscribeToAnalyticsStream() {
    this._disposables.add(
      this._analyticsService.getAnalyticsStream(new AnalyticsRequest('USD')).subscribeWithRouter(
        this.router,
        this.modelId,
        (analyticsUpdate:PositionUpdates) => {
          this._pnlChartModel.update(analyticsUpdate.history);
          this._positionsChartModel.update(analyticsUpdate.currentPositions);
          this._openFin.publishCurrentPositions(analyticsUpdate.currentPositions);
        },
        err => {
          _log.error('Error on analyticsService stream stream', err);
        }
      )
    );
  }

  _subscribeToConnectionStatus() {
    this.addDisposable(
      this._analyticsService.serviceStatusStream.subscribeWithRouter(
        this.router,
        this.modelId,
        (status:ServiceStatus) => {
          this.isAnalyticsServiceConnected = status.isConnected;
        })
    );
  }
}
