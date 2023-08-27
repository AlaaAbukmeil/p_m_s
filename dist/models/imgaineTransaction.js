"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagineTransaction = void 0;
class imagineTransaction {
    constructor(date, time, b_s, bond_cds, price, notional_amount, trader, counterparty, settlement_date, settlement_and_cds_other_notes, strategy) {
        this.date = date;
        this.time = time;
        this.b_s = b_s;
        this.bond_cds = bond_cds;
        this.price = price;
        this.notional_amount = notional_amount;
        this.trader = trader;
        this.counterparty = counterparty;
        this.settlement_date = settlement_date;
        this.settlement_and_cds_other_notes = settlement_and_cds_other_notes;
        this.strategy = strategy;
    }
}
exports.imagineTransaction = imagineTransaction;
