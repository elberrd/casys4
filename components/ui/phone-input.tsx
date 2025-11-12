/**
 * Phone Input Component
 *
 * A reusable phone number input component with country selector and automatic formatting.
 * Uses a combobox pattern for country selection with flags and dial codes.
 *
 * Features:
 * - Country selector with 175+ countries (all UN members + territories)
 * - Automatic phone number formatting based on selected country (50+ countries with format masks)
 * - Search countries by name, dial code, or country code
 * - Auto-detects country from pasted/typed dial codes
 * - Compatible with React Hook Form via forwardRef
 * - Mobile responsive with proper touch targets (h-9/36px minimum)
 * - Accessible with ARIA labels and keyboard navigation
 * - Fully internationalized (English/Portuguese) via next-intl
 * - Type-safe with TypeScript (no `any` types)
 *
 * Data Format:
 * - Input/Output format: "+[dialCode] [number]" (e.g., "+55 11 98765-4321")
 * - Automatically adds country code prefix
 * - Supports various formatting characters (spaces, hyphens, parentheses, dots)
 *
 * @example
 * // Basic usage with React Hook Form
 * <FormField
 *   control={form.control}
 *   name="phoneNumber"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>{t('phoneNumber')}</FormLabel>
 *       <FormControl>
 *         <PhoneInput {...field} defaultCountry="BR" />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 *
 * @example
 * // Usage with different default country
 * <PhoneInput
 *   value={phoneNumber}
 *   onChange={setPhoneNumber}
 *   defaultCountry="US"
 *   placeholder="Enter phone number"
 * />
 *
 * @example
 * // Usage with validation (use optionalPhoneNumberSchema from @/lib/validations/phone)
 * const schema = z.object({
 *   phoneNumber: optionalPhoneNumberSchema,
 * });
 *
 * @see {@link /lib/data/countries-phone.ts} for country data structure
 * @see {@link /lib/validations/phone.ts} for validation schemas
 */

'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCountryTranslation } from '@/lib/i18n/countries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  countries,
  type Country,
  findCountryByCode,
  findCountryByDialCode,
  formatPhoneNumber,
  cleanPhoneNumber,
} from '@/lib/data/countries-phone';

/**
 * Props for the PhoneInput component
 *
 * @extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'>
 */
export interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  /**
   * The current phone number value in international format (e.g., "+55 11 98765-4321")
   * @default ""
   */
  value?: string;

  /**
   * Callback function invoked when the phone number changes
   * Receives the new value with country code prefix
   * @param value - The new phone number value in format "+[dialCode] [number]"
   */
  onChange?: (value: string) => void;

  /**
   * ISO 3166-1 alpha-2 country code for the default country
   * @default "BR" (Brazil)
   * @example "US", "GB", "DE", "FR", "CN", "IN"
   */
  defaultCountry?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, defaultCountry = 'BR', ...props }, ref) => {
    const t = useTranslations('Common');
    const getCountryName = useCountryTranslation();
    const [open, setOpen] = React.useState(false);
    const [selectedCountry, setSelectedCountry] = React.useState<Country>(
      () => findCountryByCode(defaultCountry) || countries[0]
    );
    const [phoneNumber, setPhoneNumber] = React.useState('');

    // Parse initial value to detect country code and phone number
    React.useEffect(() => {
      if (value) {
        const cleanValue = cleanPhoneNumber(value);

        // Try to detect country from dial code
        if (cleanValue.startsWith('+') || value.startsWith('+')) {
          for (const country of countries) {
            const dialCodeDigits = cleanPhoneNumber(country.dialCode);
            if (cleanValue.startsWith(dialCodeDigits)) {
              setSelectedCountry(country);
              setPhoneNumber(cleanValue.slice(dialCodeDigits.length));
              return;
            }
          }
        }

        // If no country detected, use the phone as-is
        setPhoneNumber(cleanValue);
      }
    }, [value]);

    // Handle phone number input change
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleanValue = cleanPhoneNumber(inputValue);

      // Check if user is typing a dial code
      if (inputValue.startsWith('+')) {
        for (const country of countries) {
          const dialCodeDigits = cleanPhoneNumber(country.dialCode);
          if (cleanValue.startsWith(dialCodeDigits)) {
            if (country.code !== selectedCountry.code) {
              setSelectedCountry(country);
              const phoneOnly = cleanValue.slice(dialCodeDigits.length);
              setPhoneNumber(phoneOnly);
              onChange?.(selectedCountry.dialCode + phoneOnly);
              return;
            }
          }
        }
      }

      setPhoneNumber(cleanValue);
      onChange?.(selectedCountry.dialCode + cleanValue);
    };

    // Handle country selection
    const handleCountrySelect = (countryCode: string) => {
      const country = findCountryByCode(countryCode);
      if (country) {
        setSelectedCountry(country);
        setOpen(false);
        // Update the value with new country code
        onChange?.(country.dialCode + phoneNumber);
      }
    };

    // Handle paste to accept both formatted and unformatted
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const cleanValue = cleanPhoneNumber(pastedText);

      // Try to detect country from pasted dial code
      if (pastedText.startsWith('+')) {
        for (const country of countries) {
          const dialCodeDigits = cleanPhoneNumber(country.dialCode);
          if (cleanValue.startsWith(dialCodeDigits)) {
            e.preventDefault();
            setSelectedCountry(country);
            const phoneOnly = cleanValue.slice(dialCodeDigits.length);
            setPhoneNumber(phoneOnly);
            onChange?.(country.dialCode + phoneOnly);
            return;
          }
        }
      }

      // If no country detected from paste, just update the phone number
      e.preventDefault();
      setPhoneNumber(cleanValue);
      onChange?.(selectedCountry.dialCode + cleanValue);
    };

    // Format the display value
    const displayValue = formatPhoneNumber(phoneNumber, selectedCountry);

    return (
      <div className={cn('flex items-center w-full', className)}>
        {/* Country Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={t('selectCountry')}
              className="w-[110px] items-center justify-between rounded-e-none border-e-0 bg-transparent shrink-0"
            >
              <span className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-base leading-none" aria-hidden="true">
                  {selectedCountry.flag}
                </span>
                <span className="text-xs leading-none truncate">
                  {selectedCountry.dialCode}
                </span>
              </span>
              <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('searchCountry')} />
              <CommandList>
                <ScrollArea className="h-[300px]">
                  <CommandEmpty>{t('noCountryFound')}</CommandEmpty>
                  <CommandGroup>
                    {countries.map((country) => {
                      const translatedName = getCountryName(country.code) || country.name
                      return (
                        <CommandItem
                          key={country.code}
                          value={`${translatedName} ${country.dialCode} ${country.code}`}
                          onSelect={() => handleCountrySelect(country.code)}
                        >
                          <span className="flex items-center gap-2 leading-none flex-1 min-w-0">
                            <span className="text-base shrink-0" aria-hidden="true">
                              {country.flag}
                            </span>
                            <span className="text-sm text-foreground truncate">
                              {translatedName}
                            </span>
                            <span className="text-sm text-muted-foreground shrink-0 ml-auto">
                              {country.dialCode}
                            </span>
                          </span>
                          {selectedCountry.code === country.code && (
                            <Check className="ml-2 h-4 w-4 shrink-0" />
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <input
          ref={ref}
          type="tel"
          inputMode="tel"
          value={displayValue}
          onChange={handlePhoneChange}
          onPaste={handlePaste}
          placeholder={t('enterPhoneNumber')}
          data-slot="input"
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            'rounded-l-none flex-1'
          )}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput as default };
