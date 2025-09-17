import { EventEmitter } from 'events';
import { Transaction, FraudResult } from '../models/Transaction';

export interface FraudEvent {
  type: string;
  timestamp: Date;
  data: any;
}

export interface TransactionAnalyzedEvent extends FraudEvent {
  type: 'transaction.analyzed';
  data: {
    transaction: Transaction;
    result: FraudResult;
    processingTime: number;
  };
}

export interface AlgorithmExecutedEvent extends FraudEvent {
  type: 'algorithm.executed';
  data: {
    algorithmName: string;
    transaction: Transaction;
    score: number;
    processingTime: number;
  };
}

export interface RuleTriggeredEvent extends FraudEvent {
  type: 'rule.triggered';
  data: {
    ruleName: string;
    transaction: Transaction;
    score: number;
    threshold: number;
  };
}

export class FraudEventBus extends EventEmitter {
  private static instance: FraudEventBus;
  
  private constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }
  
  static getInstance(): FraudEventBus {
    if (!FraudEventBus.instance) {
      FraudEventBus.instance = new FraudEventBus();
    }
    return FraudEventBus.instance;
  }
  
  emitTransactionAnalyzed(event: TransactionAnalyzedEvent): void {
    this.emit('transaction.analyzed', event);
  }
  
  emitAlgorithmExecuted(event: AlgorithmExecutedEvent): void {
    this.emit('algorithm.executed', event);
  }
  
  emitRuleTriggered(event: RuleTriggeredEvent): void {
    this.emit('rule.triggered', event);
  }
  
  onTransactionAnalyzed(callback: (event: TransactionAnalyzedEvent) => void): void {
    this.on('transaction.analyzed', callback);
  }
  
  onAlgorithmExecuted(callback: (event: AlgorithmExecutedEvent) => void): void {
    this.on('algorithm.executed', callback);
  }
  
  onRuleTriggered(callback: (event: RuleTriggeredEvent) => void): void {
    this.on('rule.triggered', callback);
  }
}
