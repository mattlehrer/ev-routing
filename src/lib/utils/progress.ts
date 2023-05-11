export function printProgress(progress: number) {
	process.stdout.cursorTo(0);
	process.stdout.write(progress.toFixed(1) + '%');
}
