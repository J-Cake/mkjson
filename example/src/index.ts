 
export default async function main(args: string[], env: { [key: string]: string }): Promise<number> {
    console.log(`Hello, ${args[0]}!`);

    return 0;
}