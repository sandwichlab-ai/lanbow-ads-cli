export function outputJson<T>(data: T): void {
  console.log(JSON.stringify(data, null, 2));
}
