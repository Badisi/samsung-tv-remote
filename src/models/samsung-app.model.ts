type Token = string;

export interface SamsungApp {
    [IpAndPort: `${string}:${string}`]: Token;
}
