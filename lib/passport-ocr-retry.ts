export const PASSPORT_OCR_MAX_ATTEMPTS = 3
export const PASSPORT_OCR_ATTEMPT_TIMEOUT_MS = 35_000

interface PassportOcrRetryOptions {
  maxAttempts?: number
  timeoutMs?: number
  onAttempt?: (attempt: number, maxAttempts: number) => void
}

export class PassportOcrTimeoutError extends Error {
  constructor() {
    super("Passport OCR attempt timed out")
    this.name = "PassportOcrTimeoutError"
  }
}

export class PassportOcrAttemptsExhaustedError extends Error {
  readonly lastError: unknown

  constructor(lastError: unknown) {
    super("Passport OCR attempts exhausted")
    this.name = "PassportOcrAttemptsExhaustedError"
    this.lastError = lastError
  }
}

function runWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new PassportOcrTimeoutError())
    }, timeoutMs)

    void operation.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}

/**
 * Runs at most three visible OCR attempts by default. The caller owns the file
 * upload and passes an operation that reuses the same storage ID on each try.
 */
export async function runPassportOcrWithRetries<T>(
  operation: (attempt: number) => Promise<T>,
  options: PassportOcrRetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? PASSPORT_OCR_MAX_ATTEMPTS
  const timeoutMs = options.timeoutMs ?? PASSPORT_OCR_ATTEMPT_TIMEOUT_MS
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options.onAttempt?.(attempt, maxAttempts)

    try {
      return await runWithTimeout(operation(attempt), timeoutMs)
    } catch (error) {
      lastError = error
    }
  }

  throw new PassportOcrAttemptsExhaustedError(lastError)
}
