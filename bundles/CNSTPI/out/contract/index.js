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

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_1.fromValue(value_0),
      color: _descriptor_1.fromValue(value_0),
      value: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.color).concat(_descriptor_3.toValue(value_0.value)));
  }
}

const _descriptor_4 = new _ShieldedCoinInfo_0();

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_6 = __compactRuntime.CompactTypeOpaqueString;

const _descriptor_7 = __compactRuntime.CompactTypeBoolean;

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

const _descriptor_8 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_2.alignment().concat(_descriptor_8.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_8.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_8.toValue(value_0.right)));
  }
}

const _descriptor_9 = new _Either_0();

const _descriptor_10 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_12 = new __compactRuntime.CompactTypeBytes(188);

const _descriptor_13 = new __compactRuntime.CompactTypeBytes(288);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_15 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_15.alignment().concat(_descriptor_4.alignment().concat(_descriptor_7.alignment().concat(_descriptor_1.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_15.fromValue(value_0),
      info: _descriptor_4.fromValue(value_0),
      dataType: _descriptor_7.fromValue(value_0),
      data: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_15.toValue(value_0.domain_sep).concat(_descriptor_4.toValue(value_0.info).concat(_descriptor_7.toValue(value_0.dataType).concat(_descriptor_1.toValue(value_0.data))));
  }
}

const _descriptor_16 = new _CoinPreimage_0();

class _Either_1 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_17 = new _Either_1();

const _descriptor_18 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

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
                                     'CNSTPI.compact line 58 char 1',
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
        const result_0 = await this._name_2(context, partialProofData);
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
                                     'CNSTPI.compact line 62 char 1',
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
        const result_0 = await this._symbol_2(context, partialProofData);
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
                                     'CNSTPI.compact line 66 char 1',
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
        const result_0 = await this._decimals_2(context, partialProofData);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      tokenColor: async (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`tokenColor: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const pieceDomain_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('tokenColor',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 74 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(pieceDomain_0.buffer instanceof ArrayBuffer && pieceDomain_0.BYTES_PER_ELEMENT === 1 && pieceDomain_0.length === 32)) {
          __compactRuntime.typeError('tokenColor',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'CNSTPI.compact line 74 char 1',
                                     'Bytes<32>',
                                     pieceDomain_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(pieceDomain_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._tokenColor_2(context,
                                                  partialProofData,
                                                  pieceDomain_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      mintPiece: async (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`mintPiece: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const pieceDomain_0 = args_1[1];
        const recipient_0 = args_1[2];
        const nonce_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('mintPiece',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 84 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(pieceDomain_0.buffer instanceof ArrayBuffer && pieceDomain_0.BYTES_PER_ELEMENT === 1 && pieceDomain_0.length === 32)) {
          __compactRuntime.typeError('mintPiece',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'CNSTPI.compact line 84 char 1',
                                     'Bytes<32>',
                                     pieceDomain_0)
        }
        if (!(typeof(recipient_0) === 'object' && recipient_0.bytes.buffer instanceof ArrayBuffer && recipient_0.bytes.BYTES_PER_ELEMENT === 1 && recipient_0.bytes.length === 32)) {
          __compactRuntime.typeError('mintPiece',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'CNSTPI.compact line 84 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     recipient_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('mintPiece',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'CNSTPI.compact line 84 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(pieceDomain_0).concat(_descriptor_2.toValue(recipient_0).concat(_descriptor_1.toValue(nonce_0))),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._mintPiece_0(context,
                                                 partialProofData,
                                                 pieceDomain_0,
                                                 recipient_0,
                                                 nonce_0);
        partialProofData.output = { value: _descriptor_4.toValue(result_0), alignment: _descriptor_4.alignment() };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishOrionRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishOrionRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishOrionRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 93 char 1',
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
        const result_0 = await this._publishOrionRepository_0(context,
                                                              partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishLyraRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishLyraRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishLyraRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 104 char 1',
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
        const result_0 = await this._publishLyraRepository_0(context,
                                                             partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishCygnusRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishCygnusRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishCygnusRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 115 char 1',
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
        const result_0 = await this._publishCygnusRepository_0(context,
                                                               partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishVegaRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishVegaRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishVegaRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 126 char 1',
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
        const result_0 = await this._publishVegaRepository_0(context,
                                                             partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      },
      publishAltairRepository: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`publishAltairRepository: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishAltairRepository',
                                     'argument 1 (as invoked from Typescript)',
                                     'CNSTPI.compact line 137 char 1',
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
        const result_0 = await this._publishAltairRepository_0(context,
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
                                     'CNSTPI.compact line 151 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(payload_0.buffer instanceof ArrayBuffer && payload_0.BYTES_PER_ELEMENT === 1 && payload_0.length === 256)) {
          __compactRuntime.typeError('publishBundle',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'CNSTPI.compact line 151 char 1',
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
        const result_0 = await this._publishBundle_1(context,
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
      tokenColor: this.circuits.tokenColor,
      mintPiece: this.circuits.mintPiece,
      publishOrionRepository: this.circuits.publishOrionRepository,
      publishLyraRepository: this.circuits.publishLyraRepository,
      publishCygnusRepository: this.circuits.publishCygnusRepository,
      publishVegaRepository: this.circuits.publishVegaRepository,
      publishAltairRepository: this.circuits.publishAltairRepository,
      publishBundle: this.circuits.publishBundle
    };
    this.provableCircuits = {
      name: this.circuits.name,
      symbol: this.circuits.symbol,
      decimals: this.circuits.decimals,
      tokenColor: this.circuits.tokenColor,
      mintPiece: this.circuits.mintPiece,
      publishOrionRepository: this.circuits.publishOrionRepository,
      publishLyraRepository: this.circuits.publishLyraRepository,
      publishCygnusRepository: this.circuits.publishCygnusRepository,
      publishVegaRepository: this.circuits.publishVegaRepository,
      publishAltairRepository: this.circuits.publishAltairRepository,
      publishBundle: this.circuits.publishBundle
    };
  }
  async initialState(...args_0) {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const emitterSecretHash_0 = args_0[1];
    const name__0 = args_0[2];
    const symbol__0 = args_0[3];
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
    if (!(emitterSecretHash_0.buffer instanceof ArrayBuffer && emitterSecretHash_0.BYTES_PER_ELEMENT === 1 && emitterSecretHash_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'CNSTPI.compact line 53 char 1',
                                 'Bytes<32>',
                                 emitterSecretHash_0)
    }
    if (!(typeof (name__0) === 'string')) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'CNSTPI.compact line 53 char 1',
                                 'Opaque<"string">',
                                 name__0)
    }
    if (!(typeof (symbol__0) === 'string')) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'CNSTPI.compact line 53 char 1',
                                 'Opaque<"string">',
                                 symbol__0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('name', new __compactRuntime.ContractOperation());
    state_0.setOperation('symbol', new __compactRuntime.ContractOperation());
    state_0.setOperation('decimals', new __compactRuntime.ContractOperation());
    state_0.setOperation('tokenColor', new __compactRuntime.ContractOperation());
    state_0.setOperation('mintPiece', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishOrionRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishLyraRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishCygnusRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishVegaRepository', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishAltairRepository', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(1n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(2n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(''),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(3n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(''),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(4n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    await this._initializeEmitter_0(context,
                                    partialProofData,
                                    emitterSecretHash_0);
    await this._initialize_0(context, partialProofData, name__0, symbol__0, 0n);
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
                                         _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                   partialProofData,
                                                                                                   [
                                                                                                    { dup: { n: 2 } },
                                                                                                    { idx: { cached: true,
                                                                                                             pushPath: false,
                                                                                                             path: [
                                                                                                                    { tag: 'value',
                                                                                                                      value: { value: _descriptor_5.toValue(0n),
                                                                                                                               alignment: _descriptor_5.alignment() } }] } },
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
                                                         value: { value: _descriptor_5.toValue(4n),
                                                                  alignment: _descriptor_5.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(domain_sep_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(value_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_5.toValue(2n),
                                                                  alignment: _descriptor_5.alignment() } }] } },
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
                      _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_5.toValue(0n),
                                                                                                            alignment: _descriptor_5.alignment() } }] } },
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
                                                           value: { value: _descriptor_5.toValue(1n),
                                                                    alignment: _descriptor_5.alignment() } }] } },
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
    const recipient_0 = this._right_0(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_5.toValue(0n),
                                                                                                                            alignment: _descriptor_5.alignment() } }] } },
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
                                                         value: { value: _descriptor_5.toValue(1n),
                                                                  alignment: _descriptor_5.alignment() } }] } },
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
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_16, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_14,
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
  _EVENT_NAME_0() {
    return new Uint8Array([109, 105, 112, 45, 48, 48, 49, 56, 58, 116, 111, 107, 101, 110, 45, 109, 101, 116, 97, 100, 97, 116, 97, 91, 118, 49, 93, 0, 0, 0, 0, 0]);
  }
  _ONE_PART_VALUE_SIZE_0() { return 188n; }
  _emitterSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.emitterSecret(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('emitterSecret',
                                 'return value',
                                 'TokenMetadata.compact line 137 char 3',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _emitterSecretHashOf_0(secret_0) {
    return this._persistentHash_1([new Uint8Array([109, 105, 112, 45, 48, 48, 49, 56, 58, 101, 109, 105, 116, 116, 101, 114, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   secret_0]);
  }
  async _initializeEmitter_0(context, partialProofData, hash_0) {
    __compactRuntime.assert(!this._equal_1(hash_0, new Uint8Array(32)),
                            'TokenMetadata: zero emitter secret hash');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(hash_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _assertEmitter_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_2(this._emitterSecretHashOf_0(this._emitterSecret_0(context,
                                                                                            partialProofData)),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_5.toValue(0n),
                                                                                                                                alignment: _descriptor_5.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'TokenMetadata: caller is not the emitter');
    return [];
  }
  async _emitHead_0(context,
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
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(1n),
                                                                                                           alignment: _descriptor_18.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       this._EVENT_NAME_0(),
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       Uint8Array.from([...Array.from(domainSep_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        kind_0,
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(key_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        valType_0,
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(__compactRuntime.convertBigintToBytes(2,
                                                                                                                                                                                                                                                                                                                                                                                                            valLen_0,
                                                                                                                                                                                                                                                                                                                                                                                                            'TokenMetadata.compact line 206 char 63'),
                                                                                                                                                                                                                                                                                                                                                                      BigInt),
                                                                                                                                                                                                                                                                                                                                                        ...Array.from(valueHead_0,
                                                                                                                                                                                                                                                                                                                                                                      BigInt)],
                                                                                                                                                                                                                                                                                                                                                       Number) },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                              alignment: _descriptor_13.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _emitTokenMetadata_0(context,
                             partialProofData,
                             domainSep_0,
                             kind_0,
                             key_0,
                             valType_0,
                             valLen_0,
                             value_0)
  {
    __compactRuntime.assert(valLen_0 <= this._ONE_PART_VALUE_SIZE_0(),
                            'TokenMetadata: a one-part value holds at most 188 bytes');
    await this._emitHead_0(context,
                           partialProofData,
                           domainSep_0,
                           kind_0,
                           key_0,
                           valType_0,
                           valLen_0,
                           value_0);
    return [];
  }
  async _publishBundle_0(context, partialProofData, payload_0) {
    let t_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(1n),
                                                                                                           alignment: _descriptor_18.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(10n),
                                                                                                                                                                                                     alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue((t_0 = { name:
                                                                                                                                                                                                                                                                                                                                       new Uint8Array([109, 105, 112, 45, 120, 120, 120, 120, 58, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 91, 118, 49, 93, 0, 0, 0]),
                                                                                                                                                                                                                                                                                                                                     payload:
                                                                                                                                                                                                                                                                                                                                       payload_0 },
                                                                                                                                                                                                                                                                                                                             Uint8Array.from([...Array.from(t_0.name,
                                                                                                                                                                                                                                                                                                                                                            BigInt),
                                                                                                                                                                                                                                                                                                                                              ...Array.from(t_0.payload,
                                                                                                                                                                                                                                                                                                                                                            BigInt)],
                                                                                                                                                                                                                                                                                                                                             Number))),
                                                                                                                                                                                                                                                                                              alignment: _descriptor_13.alignment() }))
                                                          .encode() } },
                                       'log']);
    return [];
  }
  async _initialize_0(context, partialProofData, name__0, symbol__0, decimals__0)
  {
    await this._initialize_1(context,
                             partialProofData,
                             name__0,
                             symbol__0,
                             decimals__0);
    return [];
  }
  async _name_0(context, partialProofData) {
    return await this._name_1(context, partialProofData);
  }
  async _symbol_0(context, partialProofData) {
    return await this._symbol_1(context, partialProofData);
  }
  async _decimals_0(context, partialProofData) {
    return await this._decimals_1(context, partialProofData);
  }
  async _tokenColor_0(context, partialProofData, domain_0) {
    return await this._tokenColor_1(context, partialProofData, domain_0);
  }
  async __mint_0(context,
                 partialProofData,
                 domain_0,
                 recipient_0,
                 amount_0,
                 nonce_0)
  {
    return await this.__mint_1(context,
                               partialProofData,
                               domain_0,
                               this._left_0(recipient_0),
                               amount_0,
                               nonce_0);
  }
  async _initialize_1(context, partialProofData, name__0, symbol__0, decimals__0)
  {
    await this._assertNotInitialized_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(1n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(2n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(name__0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(3n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(symbol__0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(4n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(decimals__0),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  async _assertInitialized_0(context, partialProofData) {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_5.toValue(1n),
                                                                                                                  alignment: _descriptor_5.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'NativeShieldedToken: contract not initialized');
    return [];
  }
  async _assertNotInitialized_0(context, partialProofData) {
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_5.toValue(1n),
                                                                                                                   alignment: _descriptor_5.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'NativeShieldedToken: contract already initialized');
    return [];
  }
  async _name_1(context, partialProofData) {
    await this._assertInitialized_0(context, partialProofData);
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_5.toValue(2n),
                                                                                                 alignment: _descriptor_5.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _symbol_1(context, partialProofData) {
    await this._assertInitialized_0(context, partialProofData);
    return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_5.toValue(3n),
                                                                                                 alignment: _descriptor_5.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _decimals_1(context, partialProofData) {
    await this._assertInitialized_0(context, partialProofData);
    return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 0 } },
                                                                      { idx: { cached: false,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_5.toValue(4n),
                                                                                                 alignment: _descriptor_5.alignment() } }] } },
                                                                      { popeq: { cached: false,
                                                                                 result: undefined } }]).value);
  }
  async _tokenColor_1(context, partialProofData, domain_0) {
    await this._assertInitialized_0(context, partialProofData);
    return this._tokenType_0(domain_0,
                             _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_5.toValue(0n),
                                                                                                                   alignment: _descriptor_5.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  async __mint_1(context,
                 partialProofData,
                 domain_0,
                 recipient_0,
                 amount_0,
                 nonce_0)
  {
    await this._assertInitialized_0(context, partialProofData);
    const self_0 = _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 2 } },
                                                                              { idx: { cached: true,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_5.toValue(0n),
                                                                                                         alignment: _descriptor_5.alignment() } }] } },
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
    __compactRuntime.assert(!this._isKeyOrAddressZero_0(recipient_0),
                            'NativeShieldedToken: invalid recipient');
    __compactRuntime.assert(recipient_0.is_left
                            ||
                            this._equal_3(recipient_0.right, self_0),
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
  _isKeyOrAddressZero_0(keyOrAddress_0) {
    if (this._isContractAddress_0(keyOrAddress_0)) {
      return this._equal_4({ bytes: new Uint8Array(32) }, keyOrAddress_0.right);
    } else {
      return this._equal_5({ bytes: new Uint8Array(32) }, keyOrAddress_0.left);
    }
  }
  _isContractAddress_0(keyOrAddress_0) { return !keyOrAddress_0.is_left; }
  async _name_2(context, partialProofData) {
    return await this._name_0(context, partialProofData);
  }
  async _symbol_2(context, partialProofData) {
    return await this._symbol_0(context, partialProofData);
  }
  async _decimals_2(context, partialProofData) {
    return await this._decimals_0(context, partialProofData);
  }
  async _tokenColor_2(context, partialProofData, pieceDomain_0) {
    return await this._tokenColor_0(context, partialProofData, pieceDomain_0);
  }
  async _mintPiece_0(context,
                     partialProofData,
                     pieceDomain_0,
                     recipient_0,
                     nonce_0)
  {
    return await this.__mint_0(context,
                               partialProofData,
                               pieceDomain_0,
                               recipient_0,
                               1n,
                               nonce_0);
  }
  async _publishOrionRepository_0(context, partialProofData) {
    await this._assertEmitter_0(context, partialProofData);
    await this._emitTokenMetadata_0(context,
                                    partialProofData,
                                    new Uint8Array([99, 110, 115, 116, 112, 105, 58, 111, 114, 105, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    1n,
                                    new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    4n,
                                    94n,
                                    new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 67, 78, 83, 84, 80, 73, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishLyraRepository_0(context, partialProofData) {
    await this._assertEmitter_0(context, partialProofData);
    await this._emitTokenMetadata_0(context,
                                    partialProofData,
                                    new Uint8Array([99, 110, 115, 116, 112, 105, 58, 108, 121, 114, 97, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    1n,
                                    new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    4n,
                                    94n,
                                    new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 67, 78, 83, 84, 80, 73, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishCygnusRepository_0(context, partialProofData) {
    await this._assertEmitter_0(context, partialProofData);
    await this._emitTokenMetadata_0(context,
                                    partialProofData,
                                    new Uint8Array([99, 110, 115, 116, 112, 105, 58, 99, 121, 103, 110, 117, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    1n,
                                    new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    4n,
                                    94n,
                                    new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 67, 78, 83, 84, 80, 73, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishVegaRepository_0(context, partialProofData) {
    await this._assertEmitter_0(context, partialProofData);
    await this._emitTokenMetadata_0(context,
                                    partialProofData,
                                    new Uint8Array([99, 110, 115, 116, 112, 105, 58, 118, 101, 103, 97, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    1n,
                                    new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    4n,
                                    94n,
                                    new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 67, 78, 83, 84, 80, 73, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishAltairRepository_0(context, partialProofData) {
    await this._assertEmitter_0(context, partialProofData);
    await this._emitTokenMetadata_0(context,
                                    partialProofData,
                                    new Uint8Array([99, 110, 115, 116, 112, 105, 58, 97, 108, 116, 97, 105, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    1n,
                                    new Uint8Array([114, 101, 112, 111, 115, 105, 116, 111, 114, 121, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                    4n,
                                    94n,
                                    new Uint8Array([104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 97, 99, 101, 100, 119, 97, 114, 100, 47, 109, 105, 112, 45, 112, 117, 98, 108, 105, 99, 45, 105, 110, 116, 101, 114, 102, 97, 99, 101, 115, 47, 98, 108, 111, 98, 47, 109, 97, 105, 110, 47, 99, 111, 110, 116, 114, 97, 99, 116, 115, 47, 103, 101, 110, 101, 114, 97, 116, 101, 100, 47, 67, 78, 83, 84, 80, 73, 46, 99, 111, 109, 112, 97, 99, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    return [];
  }
  async _publishBundle_1(context, partialProofData, payload_0) {
    await this._assertEmitter_0(context, partialProofData);
    await this._publishBundle_0(context, partialProofData, payload_0);
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
    get TM_emitterSecretHash() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_5.toValue(0n),
                                                                                                   alignment: _descriptor_5.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
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
  'decimals': '0f3484a29486ef423c5b397e1bed8cd959769a95f32796683426e2f04054751d',
  'mintPiece': '1773587b98b01de99553399e07dda188d721be3d8314c36943705fa6b1d501ae',
  'name': '26b983cc7849cc4d70c6d1388734269b82b64366797b67c548b53e52a585e279',
  'publishAltairRepository': '36b22aa696a919d9c35c9b18c93432c3f33a7e5350f46046b4e83e6cb4706dec',
  'publishBundle': '22be3a18f3e19012658b1f44adfdc814ceba9223f48f88afeb2ffac7f52aac81',
  'publishCygnusRepository': '85f14fbcdd5c0ef84c8c558ab156f87371115f932b6d3ab031ab0245ca3d76ff',
  'publishLyraRepository': '4d2dc33f5f13c4e4cbffeed22728eb287e0a32839942a02d44aaa2fedaf8131e',
  'publishOrionRepository': 'e0aec2b433a1dc9a7d6ae7aab32e73914c9b1921e43595f76ac6ac91992c6384',
  'publishVegaRepository': 'a5bc7ad61192e83522cc02a744d01ed51c6e58fbf76a7e3e48cdee2caa86a4fd',
  'symbol': 'a66495f5af36658e272ea729e3b4778366f4ab1d332a46036da74acf0c490946',
  'tokenColor': '86f2ec5e74f8e5824b8851cfd966d1cc16e10751dc3f152e14e1729bb6f7f509',
};

//# sourceMappingURL=index.js.map
