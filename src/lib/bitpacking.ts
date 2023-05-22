import type { NodeLabel } from './station_graph';

const cumulativeDurationBits = 22;
const cumulativePowerBits = 22;
const cumulativeFinancialCostBits = 20;
const currentNodeBits = 32;
const currentLabelIndexBits = 32;
const prevNodeBits = 32;
const prevLabelIndexBits = 32;

export function bitPackData(data: NodeLabel) {
	const cumulativeDuration = Math.round(data.cumulativeDuration * 10); // Scale by 10 to convert float to integer with one decimal point
	const cumulativePower = Math.round(data.cumulativePower * 1000); // Scale by 1000 to convert float to integer with three decimal points
	const cumulativeFinancialCost = Math.round(data.cumulativeFinancialCost * 100); // Scale by 100 to convert float to integer with two decimal points
	const prevLabelIndex = data.prevLabelIndex;
	const currentLabelIndex = data.currentLabelIndex;
	const currentNode = data.currentNode.padEnd(9, ' '); // Pad with spaces to ensure length of 9
	const prevNode = data.precedingNode ? data.precedingNode.padEnd(9, ' ') : ''; // Pad with spaces if present, otherwise use empty string

	const binaryString =
		cumulativeDuration.toString(2).padStart(cumulativeDurationBits, '0') +
		cumulativePower.toString(2).padStart(cumulativePowerBits, '0') +
		cumulativeFinancialCost.toString(2).padStart(cumulativeFinancialCostBits, '0') +
		prevLabelIndex.toString(2).padStart(prevLabelIndexBits, '0') +
		currentLabelIndex.toString(2).padStart(currentLabelIndexBits, '0') +
		bitpackString(currentNode).padStart(currentNodeBits, '0') +
		bitpackString(prevNode).padStart(prevNodeBits, '0');

	const dataArray = new Uint8Array(binaryString.length / 8);

	for (let i = 0; i < binaryString.length; i += 8) {
		const byteString = binaryString.substring(i, i + 8);
		const value = parseInt(byteString, 2);
		dataArray[i / 8] = value;
	}

	return dataArray;
}

export function bitUnpackData(binaryData: ReturnType<typeof bitPackData>) {
	let binaryString = '';
	for (let i = 0; i < binaryData.length; i++) {
		binaryString += binaryData[i].toString(2).padStart(8, '0');
	}

	const cumulativeDurationBinary = binaryString.substring(0, cumulativeDurationBits);
	const cumulativePowerBinary = binaryString.substring(
		cumulativeDurationBits,
		cumulativeDurationBits + cumulativePowerBits,
	);
	const cumulativeFinancialCostBinary = binaryString.substring(
		cumulativeDurationBits + cumulativePowerBits,
		cumulativeDurationBits + cumulativePowerBits + cumulativeFinancialCostBits,
	);
	const prevLabelIndexBinary = binaryString.substring(
		cumulativeDurationBits + cumulativePowerBits + cumulativeFinancialCostBits,
		cumulativeDurationBits + cumulativePowerBits + cumulativeFinancialCostBits + prevLabelIndexBits,
	);
	const currentLabelIndexBinary = binaryString.substring(
		cumulativeDurationBits + cumulativePowerBits + cumulativeFinancialCostBits + prevLabelIndexBits,
		cumulativeDurationBits +
			cumulativePowerBits +
			cumulativeFinancialCostBits +
			prevLabelIndexBits +
			currentLabelIndexBits,
	);
	const currentNodeBinary = binaryString.substring(
		cumulativeDurationBits +
			cumulativePowerBits +
			cumulativeFinancialCostBits +
			prevLabelIndexBits +
			currentLabelIndexBits,
		cumulativeDurationBits +
			cumulativePowerBits +
			cumulativeFinancialCostBits +
			prevLabelIndexBits +
			currentLabelIndexBits +
			currentNodeBits,
	);
	const prevNodeBinary = binaryString.substring(
		cumulativeDurationBits +
			cumulativePowerBits +
			cumulativeFinancialCostBits +
			prevLabelIndexBits +
			currentLabelIndexBits +
			currentNodeBits,
		cumulativeDurationBits +
			cumulativePowerBits +
			cumulativeFinancialCostBits +
			prevLabelIndexBits +
			currentLabelIndexBits +
			currentNodeBits +
			prevNodeBits,
	);

	const cumulativeDuration = parseInt(cumulativeDurationBinary, 2) / 10; // Scale back to float with one decimal point
	const cumulativePower = parseInt(cumulativePowerBinary, 2) / 1000; // Scale back to float with three decimal points
	const cumulativeFinancialCost = parseInt(cumulativeFinancialCostBinary, 2) / 100; // Scale back to float with two decimal points
	const prevLabelIndex = parseInt(prevLabelIndexBinary, 2);
	const currentLabelIndex = parseInt(currentLabelIndexBinary, 2);
	const currentNode = unBitpackString(currentNodeBinary).trim(); // Remove trailing spaces
	const precedingNode = unBitpackString(prevNodeBinary).trim(); // Remove trailing spaces

	return {
		cumulativeDuration,
		cumulativePower,
		cumulativeFinancialCost,
		prevLabelIndex,
		currentLabelIndex,
		currentNode,
		precedingNode: currentNode === 's' && precedingNode === 's' ? null : precedingNode,
	};
}

const LETTER_BITS = 3;
const NUM_BITS = 8;
const OPT_BITS = 1;
const SECOND_NUM_BITS = 9;
const THIRD_NUM_BITS = 10;

enum Letter {
	S = 0b000,
	A = 0b001,
	B = 0b010,
	I = 0b011,
	C = 0b100,
	O = 0b101,
	D = 0b110,
}

export function bitpackString(str: string): string {
	let packed = 0;

	// First, pack the letter
	const firstLetter = str.charAt(0);
	if (firstLetter === 'c') {
		packed |= Letter.C << (NUM_BITS + OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS);
		str = str.substring(1); // Remove 'c' from the string
	} else {
		const letterCode = Letter[firstLetter.toUpperCase() as keyof typeof Letter];
		packed |= letterCode << (NUM_BITS + OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS);
		str = str.substring(1); // Remove first letter from the string
	}

	// Next, check if there's a number after the letter
	const numRegex = /^[0-9]{1,3}/;
	const numMatch = str.match(numRegex);
	if (numMatch) {
		const num = parseInt(numMatch[0], 10);
		packed |= num << (OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS);
		str = str.substring(numMatch[0].length); // Remove number from the string
	}

	// Finally, check if there's a hyphen and two more numbers after that
	if (str.startsWith('-')) {
		str = str.substring(1); // Remove hyphen from the string

		// Pack the second number
		const secondNumRegex = /^[0-9]{1,3}/;
		const secondNumMatch = str.match(secondNumRegex);
		if (secondNumMatch) {
			const secondNum = parseInt(secondNumMatch[0], 10);
			packed |= 1 << (SECOND_NUM_BITS + THIRD_NUM_BITS);
			packed |= secondNum << THIRD_NUM_BITS;
			str = str.substring(secondNumMatch[0].length + 1); // Remove second number and hyphen from the string
		}

		// Pack the third number
		const thirdNumRegex = /^[0-9]{2,3}/;
		const thirdNumMatch = str.match(thirdNumRegex);
		if (thirdNumMatch) {
			const thirdNum = parseInt(thirdNumMatch[0], 10);
			packed |= thirdNum;
		}
	}

	// Convert the packed value to a binary string
	let binaryString = packed.toString(2);
	// Pad the binary string with leading zeros if necessary
	const expectedLength = LETTER_BITS + NUM_BITS + OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS + 1;
	if (binaryString.length < expectedLength) {
		binaryString = '0'.repeat(expectedLength - binaryString.length) + binaryString;
	}

	return binaryString;
}

export function unBitpackString(binaryString: string): string {
	// Parse the packed values from the binary string
	const packed = parseInt(binaryString, 2);
	const letterCode =
		(packed & (0b111 << (NUM_BITS + OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS))) >>>
		(NUM_BITS + OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS);
	let str = Letter[letterCode].toLowerCase();
	const hasNum = !!(packed & (0b11111111 << (OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS)));
	if (hasNum) {
		const num =
			(packed & (0b11111111 << (OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS))) >>>
			(OPT_BITS + SECOND_NUM_BITS + THIRD_NUM_BITS);
		str += num.toString();
	}
	const hasHyphen = !!(packed & (0b1 << (SECOND_NUM_BITS + THIRD_NUM_BITS)));
	if (hasHyphen) {
		const secondNum = (packed & (0b0111111111 << THIRD_NUM_BITS)) >>> THIRD_NUM_BITS;
		str += `-${secondNum.toString()}`;
		const thirdNum = packed & 0b0111111111;
		str += `-${thirdNum.toString()}`;
	}
	return str;
}
