import { describe, expect, it } from 'vitest';
import { bitPackData, bitUnpackData, bitpackString, unBitpackString } from './bitpacking';
import type { NodeLabel } from './station_graph';

describe('bitpackString', () => {
	it('should convert "s" to all zeroes', () => {
		expect(bitpackString('s')).toEqual('00000000000000000000000000000000');
	});

	it('should convert "a2" to the code for a the code for a with trailing zeros', () => {
		expect(bitpackString('a2')).toEqual('00010000001000000000000000000000');
	});
	it('should convert "a0" to the code for a the code for a with trailing zeros', () => {
		expect(bitpackString('a0')).toEqual('00010000000000000000000000000000');
	});

	it('should convert "d" to the code for d the code for d with trailing zeros', () => {
		expect(bitpackString('d')).toEqual('01100000000000000000000000000000');
	});

	it('should convert "i20" to the code for i and then 20 and then trailing zeros', () => {
		expect(bitpackString('i20')).toEqual('00110001010000000000000000000000');
	});

	it('should convert "i21" to the code for i and then 21 and then trailing zeros', () => {
		expect(bitpackString('i21')).toEqual('00110001010100000000000000000000');
	});

	it('should convert "c20-50-250" to the right string', () => {
		expect(bitpackString('c20-50-250')).toEqual('01000001010010001100100011111010');
	});
	it('should convert "c34-75-43" to the right string', () => {
		expect(bitpackString('c34-75-43')).toEqual('01000010001010010010110000101011');
	});
	it('should convert "c2-10-150" to the right string', () => {
		expect(bitpackString('c2-10-150')).toEqual('01000000001010000010100010010110');
	});
});

describe('unBitpackString', () => {
	it('should unpack a string starting with "s" without a number or hyphen', () => {
		expect(unBitpackString('00000000000000000000000000000000')).toEqual('s');
	});
	it('should unpack the string to d without a number or hyphen', () => {
		expect(unBitpackString('01100000000000000000000000000000')).toEqual('d');
	});
	it('should unpack a string starting with a lowercase letter with a number and no hyphen', () => {
		expect(unBitpackString('00010000000000000000000000000000')).toEqual('a0');
	});
	it('should unpack a string starting with a lowercase letter with a number and no hyphen', () => {
		expect(unBitpackString('00010000001000000000000000000000')).toEqual('a2');
	});
	it('should unpack a string starting with a lowercase letter with a number and no hyphen', () => {
		expect(unBitpackString('00110001010000000000000000000000')).toEqual('i20');
	});
	it('should unpack a string with a number after the first letter', () => {
		expect(unBitpackString('00110001010100000000000000000000')).toEqual('i21');
	});
	it('should unpack a string with a hyphen and two numbers after the first letter', () => {
		expect(unBitpackString('01000001010010001100100011111010')).toEqual('c20-50-250');
	});
	it('should unpack a string with a hyphen and two numbers after the first letter', () => {
		expect(unBitpackString('01000010001010010010110000101011')).toEqual('c34-75-43');
	});
	it('should unpack a string with a hyphen and two numbers after the first letter', () => {
		expect(unBitpackString('01000000001010000010100010010110')).toEqual('c2-10-150');
	});
});

describe('bitPackData', () => {
	it('should correctly pack and unpack data with type cumulativeDuration', () => {
		const nodeLabel: NodeLabel = {
			cumulativeDuration: 123.4,
			cumulativeFinancialCost: 567.89,
			cumulativePower: 321.999,
			prevLabelIndex: 1,
			currentLabelIndex: 2,
			currentNode: 'o9',
			precedingNode: 'c9-10-150',
		};

		console.time('pack');
		const packed = bitPackData(nodeLabel, 'cumulativeDuration');
		console.timeEnd('pack');
		console.time('unpack');

		const unpacked = bitUnpackData(packed, 'cumulativeDuration');
		console.timeEnd('unpack');
		console.log({ unpacked });

		expect(nodeLabel).toMatchObject(unpacked);
	});

	it('should correctly pack data with type cumulativeFinancialCost', () => {
		const nodeLabel: NodeLabel = {
			cumulativeDuration: 123.4,
			cumulativeFinancialCost: 567.89,
			cumulativePower: 321.999,
			prevLabelIndex: 1,
			currentLabelIndex: 2,
			currentNode: 'b100',
			precedingNode: 'a100',
		};
		console.time('pack');
		const packed = bitPackData(nodeLabel, 'cumulativeFinancialCost');
		console.timeEnd('pack');

		console.time('unpack');
		const unpacked = bitUnpackData(packed, 'cumulativeFinancialCost');
		console.timeEnd('unpack');
		console.log({ unpacked });

		expect(nodeLabel).toMatchObject(unpacked);
	});

	it('should correctly pack data with type cumulativeFinancialCost', () => {
		const nodeLabel: NodeLabel = {
			cumulativeDuration: 123.4,
			cumulativeFinancialCost: 567.89,
			cumulativePower: 321.999,
			prevLabelIndex: 1,
			currentLabelIndex: 2,
			currentNode: 'c12-10-150',
			precedingNode: 'i12',
		};
		console.time('pack');
		const packed = bitPackData(nodeLabel, 'cumulativeFinancialCost');
		console.timeEnd('pack');

		console.time('unpack');
		const unpacked = bitUnpackData(packed, 'cumulativeFinancialCost');
		console.timeEnd('unpack');
		console.log({ unpacked });

		expect(nodeLabel).toMatchObject(unpacked);
	});
});
