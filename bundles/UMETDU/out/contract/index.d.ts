import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ContractAddress = { bytes: Uint8Array };

export type Either<A, B> = { is_left: boolean; left: A; right: B };

export type Maybe<T> = { is_some: boolean; value: T };

export type UserAddress = { bytes: Uint8Array };

export type Witnesses<PS> = {
  emitterSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  name(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  symbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  decimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  domainSep(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  tokenColor(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mints(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  mint(context: __compactRuntime.CircuitContext<PS>,
       recipient_0: Either<ContractAddress, UserAddress>,
       amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  publishName(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishSymbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishDecimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishRepository(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishBundle(context: __compactRuntime.CircuitContext<PS>,
                payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  name(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  symbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  decimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  domainSep(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  tokenColor(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mints(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  mint(context: __compactRuntime.CircuitContext<PS>,
       recipient_0: Either<ContractAddress, UserAddress>,
       amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  publishName(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishSymbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishDecimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishRepository(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishBundle(context: __compactRuntime.CircuitContext<PS>,
                payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  name(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  symbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, string>>;
  decimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  domainSep(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  tokenColor(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  mints(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, bigint>>;
  mint(context: __compactRuntime.CircuitContext<PS>,
       recipient_0: Either<ContractAddress, UserAddress>,
       amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  publishName(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishSymbol(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishDecimals(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishRepository(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishBundle(context: __compactRuntime.CircuitContext<PS>,
                payload_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
