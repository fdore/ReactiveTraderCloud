import 'aurelia-polyfills';
import { Container, inject } from 'aurelia-dependency-injection';
import React from 'react';
import ReactDOM from 'react-dom';
import { BlotterModel } from './ui/blotter/model';
import { AnalyticsModel } from './ui/analytics/model';
import { HeaderModel } from './ui/header/model';
import { FooterModel } from './ui/footer/model';
import { SidebarModel } from './ui/sidebar/model';
import { ShellModel } from './ui/shell/model';
import { ChromeModel } from './ui/common/components/chrome/model';
import { SpotTileFactory, SpotTileLoader } from './ui/spotTile';
import { User } from './services/model';
import { ReferenceDataMapper } from './services/mappers';
import { SchedulerService, } from './system';
import { AutobahnConnectionProxy, Connection } from './system/service';
import { OpenFin } from './system/openFin';
import { default as espRouter } from './system/router';
import { ShellView } from './ui/shell/views';
import { RegionModel, SingleItemRegionModel, PopoutRegionModel } from './ui/regions/model';
import { RegionManager, RegionNames } from './ui/regions';

import config from 'config.json';

import {
  AnalyticsService,
  BlotterService,
  ExecutionService,
  FakeUserRepository,
  PricingService,
  ReferenceDataService,
  CompositeStatusService
} from './services';
import { WellKnownModelIds } from './';

@inject(OpenFin,
  SchedulerService,
  Connection,
  PricingService,
  BlotterService,
  ReferenceDataService,
  ExecutionService,
  AnalyticsService,
  CompositeStatusService
)
class AppBootstrapper {
  _connection:Connection;
  _referenceDataService:ReferenceDataService;
  _pricingService:PricingService;
  _blotterService:BlotterService;
  _executionService:ExecutionService;
  _analyticsService:AnalyticsService;
  _compositeStatusService:CompositeStatusService;
  _schedulerService:SchedulerService;

  constructor(openFin:OpenFin,
              schedulerService:SchedulerService,
              connection:Connection,
              pricingService:PricingService,
              blotterService:BlotterService,
              referenceDataService:ReferenceDataService,
              executionService:ExecutionService,
              analyticsService:AnalyticsService,
              compositeStatusService:CompositeStatusService
  ) {
    this._openFin = openFin;
    this._schedulerService = schedulerService;
    this._connection = connection;
    this._referenceDataService = referenceDataService;
    this._pricingService = pricingService;
    this._blotterService = blotterService;
    this._executionService = executionService;
    this._analyticsService = analyticsService;
    this._compositeStatusService = compositeStatusService;
  }

  run() {
    this.startServices();
    this.startModels();
    this.displayUi();
  }

  startServices() {
    // connect/load all the services
    this._pricingService.connect();
    this._blotterService.connect();
    this._executionService.connect();
    this._analyticsService.connect();
    this._compositeStatusService.start();
    this._referenceDataService.connect();
    this._referenceDataService.load();
    // and finally the underlying connection
    this._connection.connect();
  }

  startModels() {

    // Wire up the region management infrastructure:
    // This infrastructure allows for differing views to be put into the shell without the shell having to be coupled to all these views.
    let workspaceRegionModel = new RegionModel(WellKnownModelIds.workspaceRegionModelId, RegionNames.workspace, espRouter);
    workspaceRegionModel.observeEvents();
    let popoutRegionModel = new PopoutRegionModel(WellKnownModelIds.popoutRegionModelId, RegionNames.popout, espRouter, this._openFin);
    popoutRegionModel.observeEvents();
    let blotterRegionModel = new SingleItemRegionModel(WellKnownModelIds.blotterRegionModelId, RegionNames.blotter, espRouter);
    blotterRegionModel.observeEvents();
    let quickAccessRegionModel = new SingleItemRegionModel(WellKnownModelIds.quickAccessRegionModelId, RegionNames.quickAccess, espRouter);
    quickAccessRegionModel.observeEvents();
    let sidebarRegionModel = new SingleItemRegionModel(WellKnownModelIds.sidebarRegionModelId, RegionNames.sidebar, espRouter);
    sidebarRegionModel.observeEvents();
    let regionManager = new RegionManager(
      [workspaceRegionModel, popoutRegionModel, blotterRegionModel, quickAccessRegionModel, sidebarRegionModel], this._openFin.isRunningInOpenFin);

    // wire up the shell
    let shellModel = new ShellModel(WellKnownModelIds.shellModelId, espRouter, this._connection, this._openFin);
    shellModel.observeEvents();

    // wire up the application chrome
    let chromeModel = new ChromeModel(WellKnownModelIds.chromeModelId, espRouter, this._openFin);
    chromeModel.observeEvents();

    // wire-up the loader that populats the workspace with spot tiles.
    // In a more suffocated app you'd have some 'add product' functionality allowing the users to add workspace views/products manually.
    let spotTileLoader = new SpotTileLoader(
      espRouter,
      this._referenceDataService,
      new SpotTileFactory(espRouter, this._pricingService, this._executionService, regionManager, this._schedulerService, this._openFin)
    );
    spotTileLoader.beginLoadTiles();

    // wire-up the sidebar
    let sidebarModel = new SidebarModel(WellKnownModelIds.sidebarModelId, espRouter, regionManager);
    sidebarModel.observeEvents();

    // wire-up the blotter
    let blotterModel = new BlotterModel(WellKnownModelIds.blotterModelId, espRouter, this._blotterService, regionManager, this._openFin);
    blotterModel.observeEvents();

    // wire-up analytics
    let analyticsModel = new AnalyticsModel(WellKnownModelIds.analyticsModelId, espRouter, this._analyticsService, regionManager, this._openFin);
    analyticsModel.observeEvents();

    // wire-up the header
    let headerModel = new HeaderModel(WellKnownModelIds.headerModelId, espRouter);
    headerModel.observeEvents();

    // wire-up the footer
    let footerModel = new FooterModel(WellKnownModelIds.footerModelId, espRouter, this._compositeStatusService, this._openFin);
    footerModel.observeEvents();

    this._referenceDataService.hasLoadedStream.subscribe(() => {
      // Some models require the ref data to be loaded before they subscribe to their streams.
      // You could make all ref data access on top of an observable API, but in most instances this make it difficult to use.
      // Synchronous APIs for data that's effectively static make for much nicer code paths, the trade off is you need to bootstrap the loading
      // so the reference data cache is ready for consumption.
      // Note the ref service still exposes a push based api, it's just in most instances you don't want to use it.
      espRouter.broadcastEvent('referenceDataLoaded', {});
    });

    if (this._openFin.isRunningInOpenFin) {
      fin.desktop.main(() => espRouter.broadcastEvent('init', {}));
    } else {
      espRouter.broadcastEvent('init', {});
    }

  }

  displayUi() {
    ReactDOM.render(
      <ShellView />,
      document.getElementById('root')
    );
  }
}

let runBootstrapper = location.pathname === '/' && location.hash.length === 0;
// if we're not the root we (perhaps a popup) we never re-run the bootstrap logic
if(runBootstrapper) {
  const container = new Container();
  let schedulerService = new SchedulerService();
  container.registerSingleton(Connection, () => {
    const url = config.overwriteServerEndpoint ? config.serverEndPointUrl : location.hostname;
    const realm = 'com.weareadaptive.reactivetrader';
    const user:User = FakeUserRepository.currentUser;

    return new Connection(
      user.code,
      new AutobahnConnectionProxy(url, realm),
      schedulerService
    );
  });
  debugger;
  container.registerSingleton(ReferenceDataService, () => {
    return new ReferenceDataService(container.get(Connection), schedulerService, container.get(ReferenceDataMapper));
  });
  const appBootstrapper = container.get(AppBootstrapper);
  appBootstrapper.run();
}
