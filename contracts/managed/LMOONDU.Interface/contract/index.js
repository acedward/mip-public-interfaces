import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.19.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(256);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_3 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_3.toValue(value_0.right)));
  }
}

const _descriptor_4 = new _Either_0();

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_6 = __compactRuntime.CompactTypeOpaqueString;

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_9 = new __compactRuntime.CompactTypeBytes(188);

const _descriptor_10 = new __compactRuntime.CompactTypeBytes(288);

const _descriptor_11 = new __compactRuntime.CompactTypeVector(1, _descriptor_2);

const _descriptor_12 = new __compactRuntime.CompactTypeVector(2, _descriptor_2);

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_1 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_14 = new _Either_1();

const _descriptor_15 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.emitterSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named emitterSecret');
    }
    if (typeof(witnesses_0.wit_FungibleTokenSK) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named wit_FungibleTokenSK');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      name: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`name: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('name',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 252 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._name_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      symbol: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`symbol: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('symbol',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 256 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._symbol_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_6.toValue(result_0), alignment: _descriptor_6.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      decimals: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`decimals: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('decimals',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 260 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._decimals_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_7.toValue(result_0), alignment: _descriptor_7.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      totalSupply: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`totalSupply: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('totalSupply',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 264 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._totalSupply_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      balanceOf: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`balanceOf: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const account_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('balanceOf',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 268 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(account_0) === 'object' && typeof(account_0.is_left) === 'boolean' && account_0.left.buffer instanceof ArrayBuffer && account_0.left.BYTES_PER_ELEMENT === 1 && account_0.left.length === 32 && typeof(account_0.right) === 'object' && account_0.right.bytes.buffer instanceof ArrayBuffer && account_0.right.bytes.BYTES_PER_ELEMENT === 1 && account_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('balanceOf',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 268 char 1',
                                     'struct Either<is_left: Boolean, left: Bytes<32>, right: struct ContractAddress<bytes: Bytes<32>>>',
                                     account_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_4.toValue(account_0),
            alignment: _descriptor_4.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._balanceOf_0(context,
                                                 partialProofData,
                                                 account_0);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      transfer: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`transfer: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const to_0 = args_1[1];
        const value_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('transfer',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 273 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(to_0) === 'object' && typeof(to_0.is_left) === 'boolean' && to_0.left.buffer instanceof ArrayBuffer && to_0.left.BYTES_PER_ELEMENT === 1 && to_0.left.length === 32 && typeof(to_0.right) === 'object' && to_0.right.bytes.buffer instanceof ArrayBuffer && to_0.right.bytes.BYTES_PER_ELEMENT === 1 && to_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('transfer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 273 char 1',
                                     'struct Either<is_left: Boolean, left: Bytes<32>, right: struct ContractAddress<bytes: Bytes<32>>>',
                                     to_0)
        }
        if (!(typeof(value_0) === 'bigint' && value_0 >= 0n && value_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('transfer',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 273 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     value_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_4.toValue(to_0).concat(_descriptor_5.toValue(value_0)),
            alignment: _descriptor_4.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._transfer_0(context,
                                                partialProofData,
                                                to_0,
                                                value_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      mint: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`mint: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const account_0 = args_1[1];
        const value_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mint',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 278 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(account_0) === 'object' && typeof(account_0.is_left) === 'boolean' && account_0.left.buffer instanceof ArrayBuffer && account_0.left.BYTES_PER_ELEMENT === 1 && account_0.left.length === 32 && typeof(account_0.right) === 'object' && account_0.right.bytes.buffer instanceof ArrayBuffer && account_0.right.bytes.BYTES_PER_ELEMENT === 1 && account_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('mint',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 278 char 1',
                                     'struct Either<is_left: Boolean, left: Bytes<32>, right: struct ContractAddress<bytes: Bytes<32>>>',
                                     account_0)
        }
        if (!(typeof(value_0) === 'bigint' && value_0 >= 0n && value_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('mint',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 278 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     value_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_4.toValue(account_0).concat(_descriptor_5.toValue(value_0)),
            alignment: _descriptor_4.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._mint_0(context,
                                            partialProofData,
                                            account_0,
                                            value_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishName: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishName: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishName',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 288 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishName_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishSymbol: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishSymbol: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishSymbol',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 301 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishSymbol_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishDecimals: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishDecimals: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishDecimals',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 311 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishDecimals_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 321 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishRepository_0(context,
                                                         partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishName2: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishName2: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishName2',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 331 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishName2_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishDescription: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishDescription: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishDescription',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 345 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishDescription_0(context,
                                                          partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      clearDescription: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`clearDescription: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('clearDescription',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 355 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._clearDescription_0(context,
                                                        partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishDescription2: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishDescription2: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishDescription2',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 365 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishDescription2_0(context,
                                                           partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishBundle: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`publishBundle: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const payload_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishBundle',
                                     'argument 1 (as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 376 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(payload_0.buffer instanceof ArrayBuffer && payload_0.BYTES_PER_ELEMENT === 1 && payload_0.length === 256)) {
          __compactRuntime.typeError('publishBundle',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'LMOONDU.Interface.compact line 376 char 1',
                                     'Bytes<256>',
                                     payload_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(payload_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._publishBundle_0(context,
                                                     partialProofData,
                                                     payload_0);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = {
      name: this.circuits.name,
      symbol: this.circuits.symbol,
      decimals: this.circuits.decimals,
      totalSupply: this.circuits.totalSupply,
      balanceOf: this.circuits.balanceOf,
      transfer: this.circuits.transfer,
      mint: this.circuits.mint,
      publishName: this.circuits.publishName,
      publishSymbol: this.circuits.publishSymbol,
      publishDecimals: this.circuits.publishDecimals,
      publishRepository: this.circuits.publishRepository,
      publishName2: this.circuits.publishName2,
      publishDescription: this.circuits.publishDescription,
      clearDescription: this.circuits.clearDescription,
      publishDescription2: this.circuits.publishDescription2,
      publishBundle: this.circuits.publishBundle
    };
    this.provableCircuits = {
      name: this.circuits.name,
      symbol: this.circuits.symbol,
      decimals: this.circuits.decimals,
      totalSupply: this.circuits.totalSupply,
      balanceOf: this.circuits.balanceOf,
      transfer: this.circuits.transfer,
      mint: this.circuits.mint,
      publishName: this.circuits.publishName,
      publishSymbol: this.circuits.publishSymbol,
      publishDecimals: this.circuits.publishDecimals,
      publishRepository: this.circuits.publishRepository,
      publishName2: this.circuits.publishName2,
      publishDescription: this.circuits.publishDescription,
      clearDescription: this.circuits.clearDescription,
      publishDescription2: this.circuits.publishDescription2,
      publishBundle: this.circuits.publishBundle
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('name', new __compactRuntime.ContractOperation());
    state_0.setOperation('symbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('decimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('totalSupply', new __compactRuntime.ContractOperation());
    state_0.setOperation('balanceOf', new __compactRuntime.ContractOperation());
    state_0.setOperation('transfer', new __compactRuntime.ContractOperation());
    state_0.setOperation('mint', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishName', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishSymbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishDecimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishName2', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishDescription', new __compactRuntime.ContractOperation());
    state_0.setOperation('clearDescription', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishDescription2', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishBundle', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext('constructor', __compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(1n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(false),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(2n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(3n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(5n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(''),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(6n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(''),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(7n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _emitterSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.emitterSecret(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('emitterSecret',
                                 'return value',
                                 'LMOONDU.Interface.compact line 53 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _wit_FungibleTokenSK_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.wit_FungibleTokenSK(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('wit_FungibleTokenSK',
                                 'return value',
                                 'LMOONDU.Interface.compact line 54 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _tm_EVENT_NAME_0() {
    return new Uint8Array([109, 105, 112, 45, 48, 48, 49, 56, 58, 116, 111, 107, 101, 110, 45, 109, 101, 116, 97, 100, 97, 116, 97, 91, 118, 49, 93, 0, 0, 0, 0, 0]);
  }
  _tm_ONE_PART_VALUE_SIZE_0() { return 188n; }
  _tm_emitterSecretHashOf_0(secret_0) {
    return this._persistentHash_1([new Uint8Array([109, 105, 112, 45, 48, 48, 49, 56, 58, 101, 109, 105, 116, 116, 101, 114, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   secret_0]);
  }
  async _tm_assertEmitter_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_0(this._tm_emitterSecretHashOf_0(this._emitterSecret_0(context,
                                                                                               partialProofData)),
                                          _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_7.toValue(0n),
                                                                                                                                alignment: _descriptor_7.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'TokenMetadata: caller is not the emitter');
    return [];
  }
  async _tm_emitHead_0(context,
                       partialProofData,
                       domainSep_0,
                       kind_0,
                       key_0,
                       valType_0,
                       valLen_0,
                       valueHead_0)
  {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(1n),
                                                                                                           alignment: _descriptor_15.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_7.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       this._tm_EVENT_NAME_0(),
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       Uint8Array.from([...Array.from(domainSep_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        kind_0,
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(key_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        valType_0,
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(__compactRuntime.convertBigintToBytes(2,
                                                                                                                                                                                                                                                                                                                                                                                                            valLen_0,
                                                                                                                                                                                                                                                                                                                                                                                                            'LMOONDU.Interface.compact line 86 char 61'),
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(valueHead_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt)],
                                                                                                                                                                                                                                                                                                                                                       Number) },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                              alignment: _descriptor_10.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _tm_emitPart_0(context, partialProofData, part_0) {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(1n),
                                                                                                           alignment: _descriptor_15.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_7.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       this._tm_EVENT_NAME_0(),
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       part_0 },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                              alignment: _descriptor_10.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _tm_emitTokenMetadata_0(context,
                                partialProofData,
                                domainSep_0,
                                kind_0,
                                key_0,
                                valType_0,
                                valLen_0,
                                value_0)
  {
    __compactRuntime.assert(valLen_0 <= this._tm_ONE_PART_VALUE_SIZE_0(),
                            'TokenMetadata: a one-part value holds at most 188 bytes');
    await this._tm_emitHead_0(context,
                              partialProofData,
                              domainSep_0,
                              kind_0,
                              key_0,
                              valType_0,
                              valLen_0,
                              value_0);
    return [];
  }
  async _oci_publishBundle_0(context, partialProofData, payload_0) {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(1n),
                                                                                                           alignment: _descriptor_15.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_7.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array([109, 105, 112, 45, 120, 120, 120, 120, 58, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 91, 118, 49, 93, 0, 0, 0]),
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       payload_0 },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                              alignment: _descriptor_10.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  _oz_utils_canonicalize_0(value_0) {
    if (value_0.is_left) {
      return { is_left: true,
               left: value_0.left,
               right: { bytes: new Uint8Array(32) } };
    } else {
      return { is_left: false, left: new Uint8Array(32), right: value_0.right };
    }
  }
  _oz_utils_zeroAccount_0() {
    return { is_left: true,
             left: new Uint8Array(32),
             right: { bytes: new Uint8Array(32) } };
  }
  _oz_utils_isTargetZero_0(target_0) {
    if (target_0.is_left) {
      return this._equal_1(target_0.left, new Uint8Array(32));
    } else {
      return this._equal_2(target_0.right, { bytes: new Uint8Array(32) });
    }
  }
  _oz_utils_computeAccountId_0(secretKey_0) {
    return this._persistentHash_0([secretKey_0]);
  }
  async _oz_ft_assertInitialized_0(context, partialProofData) {
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_7.toValue(1n),
                                                                                                                  alignment: _descriptor_7.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'FungibleToken: contract not initialized');
    return [];
  }
  async _oz_ft_name_0(context, partialProofData) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(5n),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _oz_ft_symbol_0(context, partialProofData) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(6n),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _oz_ft_decimals_0(context, partialProofData) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(7n),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _oz_ft_totalSupply_0(context, partialProofData) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_7.toValue(4n),
                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _oz_ft_balanceOf_0(context, partialProofData, account_0) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    const canonAcct_0 = this._oz_utils_canonicalize_0(account_0);
    if (!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_7.toValue(2n),
                                                                                               alignment: _descriptor_7.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(canonAcct_0),
                                                                                                                           alignment: _descriptor_4.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      return 0n;
    } else {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(2n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(canonAcct_0),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  }
  async _oz_ft__computeAccountId_0(context, partialProofData) {
    return this._oz_utils_computeAccountId_0(this._wit_FungibleTokenSK_0(context,
                                                                         partialProofData));
  }
  async _oz_ft__update_0(context, partialProofData, fromAddress_0, to_0, value_0)
  {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    const canonFrom_0 = this._oz_utils_canonicalize_0(fromAddress_0);
    const canonTo_0 = this._oz_utils_canonicalize_0(to_0);
    if (this._oz_utils_isTargetZero_0(canonFrom_0)) {
      const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
      let t_0, t_1;
      __compactRuntime.assert((t_0 = (t_1 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_7.toValue(4n),
                                                                                                                                  alignment: _descriptor_7.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value),
                                      (__compactRuntime.assert(MAX_UINT128_0
                                                               >=
                                                               t_1,
                                                               'result of subtraction would be negative'),
                                       MAX_UINT128_0 - t_1)),
                               t_0 >= value_0),
                              'FungibleToken: arithmetic overflow');
      const tmp_0 = ((t1) => {
                      if (t1 > 340282366920938463463374607431768211455n) {
                        throw new __compactRuntime.CompactError('LMOONDU.Interface.compact line 189 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                      }
                      return t1;
                    })(_descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_7.toValue(4n),
                                                                                                             alignment: _descriptor_7.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       value_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
    } else {
      const fromBal_0 = await this._oz_ft_balanceOf_0(context,
                                                      partialProofData,
                                                      canonFrom_0);
      __compactRuntime.assert(fromBal_0 >= value_0,
                              'FungibleToken: insufficient balance');
      const tmp_1 = (__compactRuntime.assert(fromBal_0 >= value_0,
                                             'result of subtraction would be negative'),
                     fromBal_0 - value_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_7.toValue(2n),
                                                                    alignment: _descriptor_7.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(canonFrom_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_1),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    if (this._oz_utils_isTargetZero_0(canonTo_0)) {
      let t_2;
      const tmp_2 = (t_2 = _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_7.toValue(4n),
                                                                                                                 alignment: _descriptor_7.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value),
                     (__compactRuntime.assert(t_2 >= value_0,
                                              'result of subtraction would be negative'),
                      t_2 - value_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_2),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
    } else {
      const toBal_0 = await this._oz_ft_balanceOf_0(context,
                                                    partialProofData,
                                                    canonTo_0);
      const tmp_3 = ((t1) => {
                      if (t1 > 340282366920938463463374607431768211455n) {
                        throw new __compactRuntime.CompactError('LMOONDU.Interface.compact line 199 char 48: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                      }
                      return t1;
                    })(toBal_0 + value_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_7.toValue(2n),
                                                                    alignment: _descriptor_7.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(canonTo_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_3),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  async _oz_ft__unsafeUncheckedTransfer_0(context,
                                          partialProofData,
                                          fromAddress_0,
                                          to_0,
                                          value_0)
  {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    __compactRuntime.assert(!this._oz_utils_isTargetZero_0(fromAddress_0),
                            'FungibleToken: invalid sender');
    __compactRuntime.assert(!this._oz_utils_isTargetZero_0(to_0),
                            'FungibleToken: invalid receiver');
    await this._oz_ft__update_0(context,
                                partialProofData,
                                fromAddress_0,
                                to_0,
                                value_0);
    return [];
  }
  async _oz_ft__unsafeTransfer_0(context, partialProofData, to_0, value_0) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    const owner_0 = this._left_0(await this._oz_ft__computeAccountId_0(context,
                                                                       partialProofData));
    await this._oz_ft__unsafeUncheckedTransfer_0(context,
                                                 partialProofData,
                                                 owner_0,
                                                 to_0,
                                                 value_0);
    return true;
  }
  async _oz_ft_transfer_0(context, partialProofData, to_0, value_0) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    const isContractAddr_0 = !to_0.is_left;
    __compactRuntime.assert(!isContractAddr_0, 'FungibleToken: unsafe transfer');
    return await this._oz_ft__unsafeTransfer_0(context,
                                               partialProofData,
                                               to_0,
                                               value_0);
  }
  async _oz_ft__unsafeMint_0(context, partialProofData, account_0, value_0) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    __compactRuntime.assert(!this._oz_utils_isTargetZero_0(account_0),
                            'FungibleToken: invalid receiver');
    await this._oz_ft__update_0(context,
                                partialProofData,
                                this._oz_utils_zeroAccount_0(),
                                account_0,
                                value_0);
    return [];
  }
  async _oz_ft__mint_0(context, partialProofData, account_0, value_0) {
    await this._oz_ft_assertInitialized_0(context, partialProofData);
    const isContractAddr_0 = !account_0.is_left;
    __compactRuntime.assert(!isContractAddr_0, 'FungibleToken: unsafe transfer');
    await this._oz_ft__unsafeMint_0(context,
                                    partialProofData,
                                    account_0,
                                    value_0);
    return [];
  }
  async _name_0(context, partialProofData) {
    return await this._oz_ft_name_0(context, partialProofData);
  }
  async _symbol_0(context, partialProofData) {
    return await this._oz_ft_symbol_0(context, partialProofData);
  }
  async _decimals_0(context, partialProofData) {
    return await this._oz_ft_decimals_0(context, partialProofData);
  }
  async _totalSupply_0(context, partialProofData) {
    return await this._oz_ft_totalSupply_0(context, partialProofData);
  }
  async _balanceOf_0(context, partialProofData, account_0) {
    return await this._oz_ft_balanceOf_0(context, partialProofData, account_0);
  }
  async _transfer_0(context, partialProofData, to_0, value_0) {
    return await this._oz_ft_transfer_0(context, partialProofData, to_0, value_0);
  }
  async _mint_0(context, partialProofData, account_0, value_0) {
    await this._oz_ft__mint_0(context, partialProofData, account_0, value_0);
    return [];
  }
  async _publishName_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([110, 97, 109, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       17n,
                                       Uint8Array.from([76n,
                                                        101n,
                                                        100n,
                                                        103n,
                                                        101n,
                                                        114n,
                                                        32n,
                                                        77n,
                                                        111n,
                                                        111n,
                                                        110n,
                                                        32n,
                                                        194n,
                                                        183n,
                                                        32n,
                                                        68n,
                                                        85n,
                                                        ...Array.from(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                      BigInt)],
                                                       Number));
    return [];
  }
  async _publishSymbol_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([115, 121, 109, 98, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       7n,
                                       new Uint8Array([76, 77, 79, 79, 78, 68, 85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishDecimals_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([100, 101, 99, 105, 109, 97, 108, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       16n,
                                       Uint8Array.from([8n,
                                                        ...Array.from(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                      BigInt)],
                                                       Number));
    return [];
  }
  async _publishRepository_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       4n,
                                       95n,
                                       new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 76, 77, 79, 79, 78, 68, 85, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishName2_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([110, 97, 109, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       27n,
                                       Uint8Array.from([76n,
                                                        101n,
                                                        100n,
                                                        103n,
                                                        101n,
                                                        114n,
                                                        32n,
                                                        77n,
                                                        111n,
                                                        111n,
                                                        110n,
                                                        32n,
                                                        194n,
                                                        183n,
                                                        32n,
                                                        68n,
                                                        85n,
                                                        32n,
                                                        40n,
                                                        114n,
                                                        101n,
                                                        110n,
                                                        97n,
                                                        109n,
                                                        101n,
                                                        100n,
                                                        41n,
                                                        ...Array.from(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                      BigInt)],
                                                       Number));
    return [];
  }
  async _publishDescription_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       52n,
                                       new Uint8Array([65, 32, 108, 101, 100, 103, 101, 114, 32, 116, 111, 107, 101, 110, 32, 116, 104, 97, 116, 32, 114, 101, 110, 97, 109, 101, 100, 32, 105, 116, 115, 101, 108, 102, 32, 105, 110, 32, 97, 32, 108, 97, 116, 101, 114, 32, 98, 108, 111, 99, 107, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _clearDescription_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       new Uint8Array([100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       5n,
                                       0n,
                                       new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishDescription2_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitHead_0(context,
                              partialProofData,
                              new Uint8Array([117, 109, 98, 114, 97, 58, 108, 109, 111, 111, 110, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                              2n,
                              new Uint8Array([100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                              1n,
                              377n,
                              new Uint8Array([76, 101, 100, 103, 101, 114, 32, 77, 111, 111, 110, 32, 99, 108, 101, 97, 114, 101, 100, 32, 105, 116, 115, 32, 100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 32, 119, 105, 116, 104, 32, 97, 32, 78, 117, 108, 108, 32, 100, 101, 99, 108, 97, 114, 97, 116, 105, 111, 110, 32, 97, 110, 100, 32, 116, 104, 101, 110, 32, 100, 101, 99, 108, 97, 114, 101, 100, 32, 116, 104, 105, 115, 32, 111, 110, 101, 58, 32, 97, 32, 118, 97, 108, 117, 101, 32, 108, 111, 110, 103, 101, 114, 32, 116, 104, 97, 110, 32, 111, 110, 101, 32, 101, 118, 101, 110, 116, 32, 99, 97, 110, 32, 104, 111, 108, 100, 44, 32, 112, 117, 98, 108, 105, 115, 104, 101, 100, 32, 97, 115, 32, 97, 32, 115, 105, 110, 103, 108, 101, 32, 77, 73, 80, 45, 48, 48, 49, 56, 32, 100, 101, 99, 108, 97, 114, 97, 116, 105, 111, 110, 32, 105, 110, 32, 116, 119, 111, 32, 112, 97, 114, 116, 115, 32, 102, 114, 111, 109]));
    await this._tm_emitPart_0(context,
                              partialProofData,
                              new Uint8Array([32, 111, 110, 101, 32, 99, 105, 114, 99, 117, 105, 116, 32, 99, 97, 108, 108, 46, 32, 84, 104, 101, 32, 105, 110, 100, 101, 120, 101, 114, 32, 112, 111, 115, 105, 116, 105, 111, 110, 115, 32, 116, 104, 101, 32, 112, 97, 99, 107, 97, 103, 101, 32, 98, 121, 32, 105, 116, 115, 32, 102, 105, 114, 115, 116, 32, 112, 97, 114, 116, 44, 32, 115, 111, 32, 116, 104, 105, 115, 32, 100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 32, 105, 115, 32, 116, 104, 101, 32, 99, 117, 114, 114, 101, 110, 116, 32, 118, 97, 108, 117, 101, 32, 97, 110, 100, 32, 116, 104, 101, 32, 99, 108, 101, 97, 114, 101, 100, 32, 111, 110, 101, 32, 115, 116, 97, 121, 115, 32, 105, 110, 32, 116, 104, 101, 32, 104, 105, 115, 116, 111, 114, 121, 46, 32, 78, 111, 116, 104, 105, 110, 103, 32, 105, 110, 32, 116, 104, 101, 115, 101, 32, 98, 121, 116, 101, 115, 32, 105, 115, 32, 102, 114, 97, 109, 105, 110, 103, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishBundle_0(context, partialProofData, payload_0) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._oci_publishBundle_0(context, partialProofData, payload_0);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({
  emitterSecret: (...args) => undefined,
  wit_FungibleTokenSK: (...args) => undefined
});
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'balanceOf': '0e4d8f5fb639a8fc7a2f9e0fa3f2d403f64f4eedd22cb65671d84191e474bbfa',
  'clearDescription': '1a34a80cc820113912bd1d582365a87f700a4955ad3049c79301790c34837c32',
  'decimals': 'bb82dadf1b29b089eb223c64b37e46347087daa528544cdf4bdf6166515ea347',
  'mint': '06efb8d9096889d2b9171e09303e4b0713b26fe9d05d4d073c1adb2653017002',
  'name': 'ab8188a3407b3cc482d7eb0e698e22df009e1045e1cfa6498e2e08dbd9311d19',
  'publishBundle': '22be3a18f3e19012658b1f44adfdc814ceba9223f48f88afeb2ffac7f52aac81',
  'publishDecimals': 'bca3b83e6309d15451e0125dee279f8cdba0b0b8260ffd5ea299788d6213270a',
  'publishDescription': '070848c5158bb992f8d46e6dd16c40bd2d4233d9b6425dd9ea17643d9e407f3b',
  'publishDescription2': '072614aa956d32d4fed9ab6b24044b1fa3c0b3c35f876f7c87332a0004450262',
  'publishName': '43315a86be606acd9006a0c51cec2fcee557a8a2d75252eebe3d440159c65fce',
  'publishName2': 'bdbfa25d77840124f5b39656de5c178c16d99baeb5243db6dbe7a7cecf00bbf3',
  'publishRepository': '13e3f553a02456e132d27f135578a1e9de942257e1273f24aef2ea6ed3122169',
  'publishSymbol': '07e67dd310e6cb15e1da5d69b3eac687429d3e44b56e7d404587b2033f38fc54',
  'symbol': 'c3dd112811c2ea60b8c4660a5b98a3701f47c51012ed0f410bfb3aec5680a83b',
  'totalSupply': '3acc705607d262f7fdc744f80b04bef102ed50309a05fe1bee1a5bae6b72f4bf',
  'transfer': 'd8b6db2598ec79d7792947e163d841d213d405e87deefd23ed931219fea5678a',
};

//# sourceMappingURL=index.js.map
