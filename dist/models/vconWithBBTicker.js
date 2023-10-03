"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vconWithBBTicker = void 0;
class vconWithBBTicker {
    constructor(brokerCode, Status, buySell, Quantity, Issue, Benchmark, Price, Yield, Principal, tradeDate, accInt, settleDate, Net, Spread, entryTime, Customer, seqNo, Account, brokerName, accruedInterest, Application) {
        this.brokerCode = brokerCode;
        this.Status = Status;
        this.buySell = buySell;
        this.Quantity = Quantity;
        this.Issue = Issue;
        this.Benchmark = Benchmark;
        this.Price = Price;
        this.Yield = Yield;
        this.Principal = Principal;
        this.tradeDate = tradeDate;
        this.accInt = accInt;
        this.settleDate = settleDate;
        this.Net = Net;
        this.Spread = Spread;
        this.entryTime = entryTime;
        this.Customer = Customer;
        this.seqNo = seqNo;
        this.Account = Account;
        this.brokerName = brokerName;
        this.accruedInterest = accruedInterest;
        this.Application = Application;
    }
}
exports.vconWithBBTicker = vconWithBBTicker;
