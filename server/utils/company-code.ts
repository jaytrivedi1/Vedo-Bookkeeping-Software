const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCompanyCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `VED-${code}`;
}

export async function generateUniqueCompanyCode(
  checkExists: (code: string) => Promise<boolean>
): Promise<string> {
  let code = generateCompanyCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (await checkExists(code) && attempts < maxAttempts) {
    code = generateCompanyCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique company code after multiple attempts');
  }
  
  return code;
}
