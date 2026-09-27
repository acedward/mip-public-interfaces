import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.19.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(256);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_2 = new _ZswapCoinPublicKey_0();

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_1.fromValue(value_0),
      color: _descriptor_1.fromValue(value_0),
      value: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.color).concat(_descriptor_4.toValue(value_0.value)));
  }
}

const _descriptor_5 = new _ShieldedCoinInfo_0();

const _descriptor_6 = __compactRuntime.CompactTypeBoolean;

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_7 = new _ContractAddress_0();

class _UserAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_8 = new _UserAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_7.alignment().concat(_descriptor_8.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_7.fromValue(value_0),
      right: _descriptor_8.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_7.toValue(value_0.left).concat(_descriptor_8.toValue(value_0.right)));
  }
}

const _descriptor_9 = new _Either_0();

const _descriptor_10 = __compactRuntime.CompactTypeOpaqueString;

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _Either_1 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_2.alignment().concat(_descriptor_7.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_7.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_7.toValue(value_0.right)));
  }
}

const _descriptor_12 = new _Either_1();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_14 = new __compactRuntime.CompactTypeBytes(188);

const _descriptor_15 = new __compactRuntime.CompactTypeBytes(288);

const _descriptor_16 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_17 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_17.alignment().concat(_descriptor_5.alignment().concat(_descriptor_6.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_17.fromValue(value_0),
      info: _descriptor_5.fromValue(value_0),
      dataType: _descriptor_6.fromValue(value_0),
      data: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_17.toValue(value_0.domain_sep).concat(_descriptor_5.toValue(value_0.info).concat(_descriptor_6.toValue(value_0.dataType).concat(_descriptor_1.toValue(value_0.data))));
  }
}

const _descriptor_18 = new _CoinPreimage_0();

class _Either_2 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_6.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_19 = new _Either_2();

const _descriptor_20 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

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
                                     'DAURDU.Interface.compact line 196 char 1',
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
        partialProofData.output = { value: _descriptor_10.toValue(result_0), alignment: _descriptor_10.alignment() };
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
                                     'DAURDU.Interface.compact line 200 char 1',
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
        partialProofData.output = { value: _descriptor_10.toValue(result_0), alignment: _descriptor_10.alignment() };
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
                                     'DAURDU.Interface.compact line 204 char 1',
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
        partialProofData.output = { value: _descriptor_11.toValue(result_0), alignment: _descriptor_11.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      domainSep: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`domainSep: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('domainSep',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 209 char 1',
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
        const result_0 = await this._domainSep_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      tokenColor: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`tokenColor: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('tokenColor',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 214 char 1',
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
        const result_0 = await this._tokenColor_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      mintShielded: async (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`mintShielded: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const amount_0 = args_1[2];
        const nonce_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintShielded',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 219 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('mintShielded',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 219 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintShielded',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 219 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('mintShielded',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 219 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(recipient_0).concat(_descriptor_3.toValue(amount_0).concat(_descriptor_1.toValue(nonce_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._mintShielded_0(context,
                                                    partialProofData,
                                                    recipient_0,
                                                    amount_0,
                                                    nonce_0);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      mintUnshielded: async (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`mintUnshielded: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const recipient_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintUnshielded',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 224 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(recipient_0) === 'object' && typeof(recipient_0.is_left) === 'boolean' && typeof(recipient_0.left) === 'object' && recipient_0.left.bytes.buffer instanceof ArrayBuffer && recipient_0.left.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.left.bytes.length === 32 && typeof(recipient_0.right) === 'object' && recipient_0.right.bytes.buffer instanceof ArrayBuffer && recipient_0.right.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('mintUnshielded',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 224 char 1',
                                     'struct Either<is_left: Boolean, left: struct ContractAddress<bytes: Bytes<32>>, right: struct UserAddress<bytes: Bytes<32>>>',
                                     recipient_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('mintUnshielded',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 224 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_9.toValue(recipient_0).concat(_descriptor_3.toValue(amount_0)),
            alignment: _descriptor_9.alignment().concat(_descriptor_3.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._mintUnshielded_0(context,
                                                      partialProofData,
                                                      recipient_0,
                                                      amount_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishUnshieldedName: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishUnshieldedName: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishUnshieldedName',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 235 char 1',
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
        const result_0 = await this._publishUnshieldedName_0(context,
                                                             partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishUnshieldedSymbol: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishUnshieldedSymbol: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishUnshieldedSymbol',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 248 char 1',
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
        const result_0 = await this._publishUnshieldedSymbol_0(context,
                                                               partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishUnshieldedDecimals: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishUnshieldedDecimals: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishUnshieldedDecimals',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 258 char 1',
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
        const result_0 = await this._publishUnshieldedDecimals_0(context,
                                                                 partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishUnshieldedRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishUnshieldedRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishUnshieldedRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 268 char 1',
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
        const result_0 = await this._publishUnshieldedRepository_0(context,
                                                                   partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishShieldedName: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishShieldedName: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishShieldedName',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 278 char 1',
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
        const result_0 = await this._publishShieldedName_0(context,
                                                           partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishShieldedSymbol: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishShieldedSymbol: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishShieldedSymbol',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 291 char 1',
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
        const result_0 = await this._publishShieldedSymbol_0(context,
                                                             partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishShieldedDecimals: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishShieldedDecimals: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishShieldedDecimals',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 301 char 1',
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
        const result_0 = await this._publishShieldedDecimals_0(context,
                                                               partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishShieldedRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishShieldedRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishShieldedRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 311 char 1',
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
        const result_0 = await this._publishShieldedRepository_0(context,
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
                                     'DAURDU.Interface.compact line 320 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(payload_0.buffer instanceof ArrayBuffer && payload_0.BYTES_PER_ELEMENT === 1 && payload_0.length === 256)) {
          __compactRuntime.typeError('publishBundle',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'DAURDU.Interface.compact line 320 char 1',
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
      domainSep: this.circuits.domainSep,
      tokenColor: this.circuits.tokenColor,
      mintShielded: this.circuits.mintShielded,
      mintUnshielded: this.circuits.mintUnshielded,
      publishUnshieldedName: this.circuits.publishUnshieldedName,
      publishUnshieldedSymbol: this.circuits.publishUnshieldedSymbol,
      publishUnshieldedDecimals: this.circuits.publishUnshieldedDecimals,
      publishUnshieldedRepository: this.circuits.publishUnshieldedRepository,
      publishShieldedName: this.circuits.publishShieldedName,
      publishShieldedSymbol: this.circuits.publishShieldedSymbol,
      publishShieldedDecimals: this.circuits.publishShieldedDecimals,
      publishShieldedRepository: this.circuits.publishShieldedRepository,
      publishBundle: this.circuits.publishBundle
    };
    this.provableCircuits = {
      name: this.circuits.name,
      symbol: this.circuits.symbol,
      decimals: this.circuits.decimals,
      domainSep: this.circuits.domainSep,
      tokenColor: this.circuits.tokenColor,
      mintShielded: this.circuits.mintShielded,
      mintUnshielded: this.circuits.mintUnshielded,
      publishUnshieldedName: this.circuits.publishUnshieldedName,
      publishUnshieldedSymbol: this.circuits.publishUnshieldedSymbol,
      publishUnshieldedDecimals: this.circuits.publishUnshieldedDecimals,
      publishUnshieldedRepository: this.circuits.publishUnshieldedRepository,
      publishShieldedName: this.circuits.publishShieldedName,
      publishShieldedSymbol: this.circuits.publishShieldedSymbol,
      publishShieldedDecimals: this.circuits.publishShieldedDecimals,
      publishShieldedRepository: this.circuits.publishShieldedRepository,
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
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('name', new __compactRuntime.ContractOperation());
    state_0.setOperation('symbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('decimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('domainSep', new __compactRuntime.ContractOperation());
    state_0.setOperation('tokenColor', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintShielded', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintUnshielded', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishUnshieldedName', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishUnshieldedSymbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishUnshieldedDecimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishUnshieldedRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishShieldedName', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishShieldedSymbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishShieldedDecimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishShieldedRepository', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(1n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(2n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(false),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(3n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(''),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(4n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(''),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(5n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(0n),
                                                                                              alignment: _descriptor_11.alignment() }).encode() } },
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
  _left_1(value_0) {
    return { is_left: true, left: value_0, right: new Uint8Array(32) };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _tokenType_0(domain_sep_0, contractAddress_0) {
    return this._persistentCommit_0([domain_sep_0, contractAddress_0.bytes],
                                    new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 100, 101, 114, 105, 118, 101, 95, 116, 111, 107, 101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  }
  async _mintShieldedToken_0(context,
                             partialProofData,
                             domain_sep_0,
                             value_0,
                             nonce_0,
                             recipient_0)
  {
    const coin_0 = { nonce: nonce_0,
                     color:
                       this._tokenType_0(domain_sep_0,
                                         _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                   partialProofData,
                                                                                                   [
                                                                                                    { dup: { n: 2 } },
                                                                                                    { idx: { cached: true,
                                                                                                             pushPath: false,
                                                                                                             path: [
                                                                                                                    { tag: 'value',
                                                                                                                      value: { value: _descriptor_11.toValue(0n),
                                                                                                                               alignment: _descriptor_11.alignment() } }] } },
                                                                                                    { popeq: { cached: true,
                                                                                                               result: undefined } }]).value)),
                     value: value_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(4n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(domain_sep_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(value_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const cm_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(2n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_0(recipient_0.right.bytes,
                      _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_11.toValue(1n),
                                                                    alignment: _descriptor_11.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(cm_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return coin_0;
  }
  async _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const tmp_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(1n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _coinCommitment_0(coin_0, recipient_0) {
    return this._persistentHash_0({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: recipient_0.is_left,
                                    data:
                                      recipient_0.is_left ?
                                      recipient_0.left.bytes :
                                      recipient_0.right.bytes });
  }
  async _mintUnshieldedToken_0(context,
                               partialProofData,
                               domainSep_0,
                               amount_0,
                               recipient_0)
  {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(5n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(domainSep_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(amount_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const color_0 = this._tokenType_0(domainSep_0,
                                      _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    const tmp_0 = this._left_1(color_0);
    const tmp_1 = amount_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_11.toValue(8n),
                                                                  alignment: _descriptor_11.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_19.toValue(tmp_0),
                                                                                                alignment: _descriptor_19.alignment() },
                                                                                              { value: _descriptor_9.toValue(recipient_0),
                                                                                                alignment: _descriptor_9.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_1),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_1(recipient_0.left.bytes,
                      _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_11.toValue(0n),
                                                                                                            alignment: _descriptor_11.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_1(color_0);
      const tmp_3 = amount_0;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_11.toValue(6n),
                                                                    alignment: _descriptor_11.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_19.toValue(tmp_2),
                                                                                                alignment: _descriptor_19.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_3),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return color_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_18, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_16, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_16,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _emitterSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.emitterSecret(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('emitterSecret',
                                 'return value',
                                 'DAURDU.Interface.compact line 51 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
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
    __compactRuntime.assert(this._equal_2(this._tm_emitterSecretHashOf_0(this._emitterSecret_0(context,
                                                                                               partialProofData)),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_11.toValue(0n),
                                                                                                                                alignment: _descriptor_11.alignment() } }] } },
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
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(1n),
                                                                                                           alignment: _descriptor_20.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_11.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue((t_0 = { name:
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
                                                                                                                                                                                                                                                                                                                                                                                                             'DAURDU.Interface.compact line 83 char 61'),
                                                                                                                                                                                                                                                                                                                                                                       BigInt),
                                                                                                                                                                                                                                                                                                                                                         ...Array.from(valueHead_0,
                                                                                                                                                                                                                                                                                                                                                                       BigInt)],
                                                                                                                                                                                                                                                                                                                                                        Number) },
                                                                                                                                                                                                                                                                                                                              Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                             BigInt),
                                                                                                                                                                                                                                                                                                                                               ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                             BigInt)],
                                                                                                                                                                                                                                                                                                                                              Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_15.alignment() }))
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
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(1n),
                                                                                                           alignment: _descriptor_20.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_11.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_11.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                        new Uint8Array([109, 105, 112, 45, 120, 120, 120, 120, 58, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 91, 118, 49, 93, 0, 0, 0]),
                                                                                                                                                                                                                                                                                                                                      payload:
                                                                                                                                                                                                                                                                                                                                        payload_0 },
                                                                                                                                                                                                                                                                                                                              Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                             BigInt),
                                                                                                                                                                                                                                                                                                                                               ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                             BigInt)],
                                                                                                                                                                                                                                                                                                                                              Number))),
                                                                                                                                                                                                                                                                                               alignment: _descriptor_15.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  _oz_utils_isContractAddress_0(keyOrAddress_0) {
    return !keyOrAddress_0.is_left;
  }
  _oz_utils_isKeyOrAddressZero_0(keyOrAddress_0) {
    if (this._oz_utils_isContractAddress_0(keyOrAddress_0)) {
      return this._equal_3({ bytes: new Uint8Array(32) }, keyOrAddress_0.right);
    } else {
      return this._equal_4({ bytes: new Uint8Array(32) }, keyOrAddress_0.left);
    }
  }
  async _oz_core_assertInitialized_0(context, partialProofData) {
    __compactRuntime.assert(_descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_11.toValue(2n),
                                                                                                                  alignment: _descriptor_11.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'NativeShieldedToken: contract not initialized');
    return [];
  }
  async _oz_core_name_0(context, partialProofData) {
    await this._oz_core_assertInitialized_0(context, partialProofData);
    return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 0 } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_11.toValue(3n),
                                                                                                  alignment: _descriptor_11.alignment() } }] } },
                                                                       { popeq: { cached: false,
                                                                                  result: undefined } }]).value);
  }
  async _oz_core_symbol_0(context, partialProofData) {
    await this._oz_core_assertInitialized_0(context, partialProofData);
    return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 0 } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_11.toValue(4n),
                                                                                                  alignment: _descriptor_11.alignment() } }] } },
                                                                       { popeq: { cached: false,
                                                                                  result: undefined } }]).value);
  }
  async _oz_core_decimals_0(context, partialProofData) {
    await this._oz_core_assertInitialized_0(context, partialProofData);
    return _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 0 } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_11.toValue(5n),
                                                                                                  alignment: _descriptor_11.alignment() } }] } },
                                                                       { popeq: { cached: false,
                                                                                  result: undefined } }]).value);
  }
  async _oz_core_tokenColor_0(context, partialProofData, domain_0) {
    await this._oz_core_assertInitialized_0(context, partialProofData);
    return this._tokenType_0(domain_0,
                             _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_11.toValue(0n),
                                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  async _oz_core__mint_0(context,
                         partialProofData,
                         domain_0,
                         recipient_0,
                         amount_0,
                         nonce_0)
  {
    await this._oz_core_assertInitialized_0(context, partialProofData);
    const self_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 2 } },
                                                                              { idx: { cached: true,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_11.toValue(0n),
                                                                                                         alignment: _descriptor_11.alignment() } }] } },
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
    __compactRuntime.assert(!this._oz_utils_isKeyOrAddressZero_0(recipient_0),
                            'NativeShieldedToken: invalid recipient');
    __compactRuntime.assert(recipient_0.is_left
                            ||
                            this._equal_5(recipient_0.right, self_0),
                            'NativeShieldedToken: recipient contract must be self');
    const coin_0 = await this._mintShieldedToken_0(context,
                                                   partialProofData,
                                                   domain_0,
                                                   amount_0,
                                                   nonce_0,
                                                   recipient_0);
    if (!recipient_0.is_left) {
      await this._receiveShielded_0(context, partialProofData, coin_0);
    }
    return coin_0;
  }
  async _oz_nst_name_0(context, partialProofData) {
    return await this._oz_core_name_0(context, partialProofData);
  }
  async _oz_nst_symbol_0(context, partialProofData) {
    return await this._oz_core_symbol_0(context, partialProofData);
  }
  async _oz_nst_decimals_0(context, partialProofData) {
    return await this._oz_core_decimals_0(context, partialProofData);
  }
  async _oz_nst_tokenColor_0(context, partialProofData) {
    return await this._oz_core_tokenColor_0(context,
                                            partialProofData,
                                            _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                      partialProofData,
                                                                                                      [
                                                                                                       { dup: { n: 0 } },
                                                                                                       { idx: { cached: false,
                                                                                                                pushPath: false,
                                                                                                                path: [
                                                                                                                       { tag: 'value',
                                                                                                                         value: { value: _descriptor_11.toValue(1n),
                                                                                                                                  alignment: _descriptor_11.alignment() } }] } },
                                                                                                       { popeq: { cached: false,
                                                                                                                  result: undefined } }]).value));
  }
  async _oz_nst__mint_0(context,
                        partialProofData,
                        recipient_0,
                        amount_0,
                        nonce_0)
  {
    return await this._oz_core__mint_0(context,
                                       partialProofData,
                                       _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                 partialProofData,
                                                                                                 [
                                                                                                  { dup: { n: 0 } },
                                                                                                  { idx: { cached: false,
                                                                                                           pushPath: false,
                                                                                                           path: [
                                                                                                                  { tag: 'value',
                                                                                                                    value: { value: _descriptor_11.toValue(1n),
                                                                                                                             alignment: _descriptor_11.alignment() } }] } },
                                                                                                  { popeq: { cached: false,
                                                                                                             result: undefined } }]).value),
                                       this._left_0(recipient_0),
                                       amount_0,
                                       nonce_0);
  }
  async _name_0(context, partialProofData) {
    return await this._oz_nst_name_0(context, partialProofData);
  }
  async _symbol_0(context, partialProofData) {
    return await this._oz_nst_symbol_0(context, partialProofData);
  }
  async _decimals_0(context, partialProofData) {
    return await this._oz_nst_decimals_0(context, partialProofData);
  }
  async _domainSep_0(context, partialProofData) {
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_11.toValue(1n),
                                                                                                 alignment: _descriptor_11.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _tokenColor_0(context, partialProofData) {
    return await this._oz_nst_tokenColor_0(context, partialProofData);
  }
  async _mintShielded_0(context,
                        partialProofData,
                        recipient_0,
                        amount_0,
                        nonce_0)
  {
    return await this._oz_nst__mint_0(context,
                                      partialProofData,
                                      recipient_0,
                                      amount_0,
                                      nonce_0);
  }
  async _mintUnshielded_0(context, partialProofData, recipient_0, amount_0) {
    __compactRuntime.assert(amount_0 > 0n, 'amount must be positive');
    return await this._mintUnshieldedToken_0(context,
                                             partialProofData,
                                             _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_11.toValue(1n),
                                                                                                                                   alignment: _descriptor_11.alignment() } }] } },
                                                                                                        { popeq: { cached: false,
                                                                                                                   result: undefined } }]).value),
                                             amount_0,
                                             recipient_0);
  }
  async _publishUnshieldedName_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       0n,
                                       new Uint8Array([110, 97, 109, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       17n,
                                       Uint8Array.from([68n,
                                                        117n,
                                                        97n,
                                                        108n,
                                                        32n,
                                                        65n,
                                                        117n,
                                                        114n,
                                                        111n,
                                                        114n,
                                                        97n,
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
  async _publishUnshieldedSymbol_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       0n,
                                       new Uint8Array([115, 121, 109, 98, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       6n,
                                       new Uint8Array([68, 65, 85, 82, 68, 85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishUnshieldedDecimals_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       0n,
                                       new Uint8Array([100, 101, 99, 105, 109, 97, 108, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       16n,
                                       Uint8Array.from([6n,
                                                        ...Array.from(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                      BigInt)],
                                                       Number));
    return [];
  }
  async _publishUnshieldedRepository_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       0n,
                                       new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       4n,
                                       94n,
                                       new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 68, 65, 85, 82, 68, 85, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishShieldedName_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       new Uint8Array([110, 97, 109, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       17n,
                                       Uint8Array.from([68n,
                                                        117n,
                                                        97n,
                                                        108n,
                                                        32n,
                                                        65n,
                                                        117n,
                                                        114n,
                                                        111n,
                                                        114n,
                                                        97n,
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
  async _publishShieldedSymbol_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       new Uint8Array([115, 121, 109, 98, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       6n,
                                       new Uint8Array([68, 65, 85, 82, 68, 85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishShieldedDecimals_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       new Uint8Array([100, 101, 99, 105, 109, 97, 108, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       2n,
                                       16n,
                                       Uint8Array.from([6n,
                                                        ...Array.from(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                                                      BigInt)],
                                                       Number));
    return [];
  }
  async _publishShieldedRepository_0(context, partialProofData) {
    await this._tm_assertEmitter_0(context, partialProofData);
    await this._tm_emitTokenMetadata_0(context,
                                       partialProofData,
                                       new Uint8Array([117, 109, 98, 114, 97, 58, 100, 97, 117, 114, 100, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       1n,
                                       new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                       4n,
                                       94n,
                                       new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 68, 65, 85, 82, 68, 85, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_4(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_5(x0, y0) {
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
const _dummyContract = new Contract({ emitterSecret: (...args) => undefined });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
export const expectedVk = {
  'decimals': '39f9cfa4547c143253ced8ed36aeaf2208b6985844fec671059c6ee900bbbe50',
  'domainSep': '94efb117c9e16dc367661a22cd9227d41da37f44f45c5d61b2fd830321657167',
  'mintShielded': 'e91c18a4bf603a9e4f9586cbd27cadb9f8cba02725d27737cdbfa1ec2e10d6f4',
  'mintUnshielded': 'c0e2284313a63b0323fb5e1355f0306299ae1106d2551327105c0ad5e9c857e9',
  'name': 'a02ccf1f710e2af868875e1e08517b1041db086306dc060056345671410fc79b',
  'publishBundle': '22be3a18f3e19012658b1f44adfdc814ceba9223f48f88afeb2ffac7f52aac81',
  'publishShieldedDecimals': '9cb3ab6e7c375d57848aeebe4eab768bb817c043667c50939102293e1c52d069',
  'publishShieldedName': 'a88959f99bb39ee97e71bac735f3781dd373ab5f27808eceb863e047b2d40978',
  'publishShieldedRepository': '9ce73acecf980cffc96a921328afeec1a8a568bcac63c42d2dba1dadc5ebb56e',
  'publishShieldedSymbol': 'e989197d3febbdc7cc002653b1fc3aa66668871ccc9edff41840838d00ac5525',
  'publishUnshieldedDecimals': 'c429c5380f17b4c59642ce739f8415b3322e807e69283958761bb7ecbe579c41',
  'publishUnshieldedName': 'e3d1698232cf925168217551dddf0eb4dd831fe5ab543662da0b9055b1a9577f',
  'publishUnshieldedRepository': 'f3a1d6385e9e1a61101c113c4827fc14a69faf6f0643aace10217209cc6ddf5b',
  'publishUnshieldedSymbol': '1ea919542ba6bd8ffb7dcf6f3ff6418becfe79dbca679c1811ac46de528c0a8e',
  'symbol': '2ab50c5ceed771e8e3ca28e49b99a9ab9971fce3a7d9fe4ec296b94b989ce04f',
  'tokenColor': '34e1ca828c13934c9969fa8f276677712322ea375907dbee184a4f26db7e4e21',
};

//# sourceMappingURL=index.js.map
