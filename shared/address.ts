const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/** Valida o formato de um endereço EVM. Estrito: quem chama é responsável pelo trim. */
export function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}
