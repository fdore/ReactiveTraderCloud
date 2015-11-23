﻿using Akka.Actor;

namespace Adaptive.ReactiveTrader.Server.Blotter.TradeCache
{
    public class WarmUpCacheMessage
    {
        public IActorRef EventStoreActorRef { get; }

        public WarmUpCacheMessage(IActorRef eventStoreActorRef)
        {
            EventStoreActorRef = eventStoreActorRef;
        }
    }
}