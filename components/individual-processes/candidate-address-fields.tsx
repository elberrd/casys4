"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { BRAZIL_COUNTRY_CODE } from "@/lib/data/brazil-states";
import {
  applyBrazilCheckbox,
  applyCepLookupResult,
  isBrazilAddressSelected,
  type CandidateAddressValue,
} from "@/lib/utils/candidate-address";
import { isCompleteCep, lookupBrazilianCep } from "@/lib/utils/viacep";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CEPInput } from "@/components/ui/cep-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CountryOption {
  isoCode: string;
  name: string;
}
interface StateOption {
  isoCode: string;
  name: string;
}
interface CityOption {
  name: string;
}

export interface CandidateAddressFieldsProps {
  value: CandidateAddressValue;
  onChange: (value: CandidateAddressValue) => void;
  disabled?: boolean;
}

export function CandidateAddressFields({
  value,
  onChange,
  disabled = false,
}: CandidateAddressFieldsProps) {
  const t = useTranslations("CandidateAddress");
  const { toast } = useToast();

  const isBrazil = isBrazilAddressSelected(value);
  const dbCountries = useQuery(api.countries.list, {});

  const [states, setStates] = React.useState<StateOption[]>([]);
  const [statesLoaded, setStatesLoaded] = React.useState(false);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [cities, setCities] = React.useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [lookingUpCep, setLookingUpCep] = React.useState(false);

  const countries: CountryOption[] = React.useMemo(() => {
    const byCode = new Map<
      string,
      { isoCode: string; name: string; iso3?: string }
    >();
    for (const country of dbCountries ?? []) {
      const iso = country.code;
      if (!iso) continue;
      const existing = byCode.get(iso);
      if (!existing || (!existing.iso3 && country.iso3)) {
        byCode.set(iso, {
          isoCode: iso,
          name: country.name,
          iso3: country.iso3,
        });
      }
    }
    return Array.from(byCode.values())
      .map(({ isoCode, name }) => ({ isoCode, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCountries]);

  const brazilCountryName = React.useMemo(() => {
    return (
      countries.find((country) => country.isoCode === BRAZIL_COUNTRY_CODE)
        ?.name ?? "Brasil"
    );
  }, [countries]);

  const countryCode = value.addressCountryCode;
  const stateCode = value.addressStateCode;

  const merge = React.useCallback(
    (patch: Partial<CandidateAddressValue>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  React.useEffect(() => {
    if (!countryCode) {
      setStates([]);
      setStatesLoaded(false);
      return;
    }

    let cancelled = false;
    setLoadingStates(true);
    setStatesLoaded(false);

    import("country-state-city")
      .then(({ State }) => {
        if (cancelled) return;
        const list = State.getStatesOfCountry(countryCode) ?? [];
        setStates(list.map((s) => ({ isoCode: s.isoCode, name: s.name })));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load state list:", error);
        setStates([]);
      })
      .finally(() => {
        if (cancelled) return;
        setStatesLoaded(true);
        setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  React.useEffect(() => {
    if (!countryCode || !statesLoaded) {
      setCities([]);
      return;
    }
    const hasStates = states.length > 0;
    if (hasStates && !stateCode) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);

    import("country-state-city")
      .then(({ City }) => {
        if (cancelled) return;
        const list = hasStates
          ? (City.getCitiesOfState(countryCode, stateCode ?? "") ?? [])
          : (City.getCitiesOfCountry(countryCode) ?? []);
        setCities(list.map((city) => ({ name: city.name })));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load city list:", error);
        setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode, stateCode, statesLoaded, states.length]);

  const countryOptions: ComboboxOption[] = React.useMemo(() => {
    const options = countries.map((country) => ({
      value: country.isoCode,
      label: country.name,
    }));

    const ensure = (code: string, name: string) => {
      if (!code) return;
      if (!options.some((option) => option.value === code)) {
        options.unshift({
          value: code,
          label: name || code,
        });
      }
    };

    if (isBrazil) {
      ensure(BRAZIL_COUNTRY_CODE, brazilCountryName);
    }
    if (value.addressCountryCode) {
      ensure(
        value.addressCountryCode,
        value.addressCountryName || value.addressCountryCode,
      );
    }

    return options;
  }, [
    brazilCountryName,
    countries,
    isBrazil,
    value.addressCountryCode,
    value.addressCountryName,
  ]);

  const stateOptions: ComboboxOption[] = React.useMemo(() => {
    const options = states.map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
    if (
      value.addressStateCode &&
      !options.some((option) => option.value === value.addressStateCode)
    ) {
      options.unshift({
        value: value.addressStateCode,
        label: value.addressStateName || value.addressStateCode,
      });
    }
    return options;
  }, [states, value.addressStateCode, value.addressStateName]);

  const cityOptions: ComboboxOption[] = React.useMemo(() => {
    const options = cities.map((city) => ({
      value: city.name,
      label: city.name,
    }));
    if (
      value.addressCity &&
      !options.some((option) => option.value === value.addressCity)
    ) {
      options.unshift({
        value: value.addressCity,
        label: value.addressCity,
      });
    }
    return options;
  }, [cities, value.addressCity]);

  const showStateSelect = !countryCode || !statesLoaded || states.length > 0;
  const cityDisabled =
    disabled || !countryCode || (states.length > 0 && !stateCode);

  const handleBrazilChange = (checked: boolean) => {
    merge(
      applyBrazilCheckbox({
        checked,
        value,
        brazilCountryName,
      }),
    );
  };

  const handleCountryChange = (nextCode: string | undefined) => {
    if (!nextCode) {
      merge({
        addressCountryCode: "",
        addressCountryName: "",
        addressStateCode: "",
        addressStateName: "",
        addressCity: "",
      });
      return;
    }
    const selected = countries.find((country) => country.isoCode === nextCode);
    merge({
      addressIsBrazil: nextCode === BRAZIL_COUNTRY_CODE,
      addressCountryCode: nextCode,
      addressCountryName: selected?.name ?? nextCode,
      addressStateCode: "",
      addressStateName: "",
      addressCity: "",
    });
  };

  const handleStateChange = (nextCode: string | undefined) => {
    const selected = states.find((state) => state.isoCode === nextCode);
    merge({
      addressStateCode: nextCode ?? "",
      addressStateName: selected?.name ?? "",
      addressCity: "",
    });
  };

  const handleLookupCep = async () => {
    const postalCode = value.addressPostalCode ?? "";
    if (!isCompleteCep(postalCode)) {
      toast({
        title: t("cepIncomplete"),
        variant: "destructive",
      });
      return;
    }

    setLookingUpCep(true);
    try {
      const lookup = await lookupBrazilianCep(postalCode);
      if (!lookup) {
        toast({
          title: t("cepNotFound"),
          variant: "destructive",
        });
        return;
      }
      onChange(
        applyCepLookupResult({
          value,
          lookup,
          brazilCountryName,
        }),
      );
      toast({
        title: t("cepLookupSuccess"),
      });
    } catch (error) {
      console.error("CEP lookup failed:", error);
      toast({
        title: t("cepLookupError"),
        variant: "destructive",
      });
    } finally {
      setLookingUpCep(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormCheckboxRow
        id="candidate-address-is-brazil"
        checked={isBrazil}
        disabled={disabled}
        label={t("isBrazil")}
        description={t("isBrazilDescription")}
        onCheckedChange={handleBrazilChange}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="candidate-address-postal-code">
            {isBrazil ? t("postalCode") : t("postalCodeForeign")}
          </Label>
          {isBrazil ? (
            <div className="flex gap-2">
              <CEPInput
                id="candidate-address-postal-code"
                value={value.addressPostalCode ?? ""}
                onChange={(next) => merge({ addressPostalCode: next })}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-9 w-9 shrink-0"
                disabled={disabled || lookingUpCep}
                onClick={() => void handleLookupCep()}
                title={t("searchCep")}
              >
                {lookingUpCep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="sr-only">{t("searchCep")}</span>
              </Button>
            </div>
          ) : (
            <Input
              id="candidate-address-postal-code"
              value={value.addressPostalCode ?? ""}
              onChange={(event) =>
                merge({ addressPostalCode: event.target.value })
              }
              disabled={disabled}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("country")}</Label>
          <Combobox
            options={countryOptions}
            value={value.addressCountryCode || undefined}
            onValueChange={handleCountryChange}
            placeholder={t("selectCountry")}
            searchPlaceholder={t("searchCountry")}
            emptyText={t("noCountriesFound")}
            loading={dbCountries === undefined}
            loadingText={t("loadingCountries")}
            disabled={disabled || isBrazil}
            showClearButton={!isBrazil}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showStateSelect && (
          <div className="space-y-2">
            <Label>{t("state")}</Label>
            <Combobox
              options={stateOptions}
              value={value.addressStateCode || undefined}
              onValueChange={handleStateChange}
              placeholder={t("selectState")}
              searchPlaceholder={t("searchState")}
              emptyText={t("noStatesFound")}
              loading={loadingStates}
              loadingText={t("loadingStates")}
              disabled={disabled || !value.addressCountryCode}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("city")}</Label>
          <Combobox
            options={cityOptions}
            value={value.addressCity || undefined}
            onValueChange={(next) => merge({ addressCity: next ?? "" })}
            placeholder={t("selectCity")}
            searchPlaceholder={t("searchCity")}
            emptyText={t("noCitiesFound")}
            loading={loadingCities}
            loadingText={t("loadingCities")}
            disabled={cityDisabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="candidate-address-street">{t("street")}</Label>
        <Input
          id="candidate-address-street"
          value={value.addressStreet ?? ""}
          onChange={(event) => merge({ addressStreet: event.target.value })}
          placeholder={t("streetPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="candidate-address-complement">{t("complement")}</Label>
        <Input
          id="candidate-address-complement"
          value={value.addressComplement ?? ""}
          onChange={(event) =>
            merge({ addressComplement: event.target.value })
          }
          placeholder={t("complementPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div
        className={cn(
          "space-y-2 rounded-md border border-yellow-400 bg-yellow-50 p-4",
          "dark:border-yellow-600 dark:bg-yellow-950/40",
        )}
      >
        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
          {t("deprecatedAddressTitle")}
        </p>
        <p className="text-sm text-yellow-800 dark:text-yellow-200/90">
          {t("deprecatedAddressNote")}
        </p>
        <Label
          htmlFor="candidate-address-legacy"
          className="text-yellow-900 dark:text-yellow-200"
        >
          {t("deprecatedAddressLabel")}
        </Label>
        <Textarea
          id="candidate-address-legacy"
          value={value.residenceAddressAbroad ?? ""}
          onChange={(event) =>
            merge({ residenceAddressAbroad: event.target.value })
          }
          rows={3}
          disabled={disabled}
          className="resize-none bg-yellow-50/60 dark:bg-yellow-950/20"
        />
      </div>
    </div>
  );
}

export function CandidateAddressDetailRows({
  value,
}: {
  value: CandidateAddressValue;
}) {
  const t = useTranslations("CandidateAddress");
  const tCommon = useTranslations("Common");
  const postalCode = value.addressPostalCode?.trim() ?? "";
  const formattedPostal =
    postalCode.replace(/\D/g, "").length === 8
      ? postalCode.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")
      : postalCode;
  const stateLabel = value.addressStateName || value.addressStateCode;

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t("isBrazil"),
      value: value.addressIsBrazil === true ? tCommon("yes") : tCommon("no"),
    },
    { label: t("postalCode"), value: formattedPostal },
    { label: t("country"), value: value.addressCountryName ?? "" },
    { label: t("state"), value: stateLabel ?? "" },
    { label: t("city"), value: value.addressCity ?? "" },
    { label: t("street"), value: value.addressStreet ?? "" },
    { label: t("complement"), value: value.addressComplement ?? "" },
    {
      label: t("deprecatedAddressLabel"),
      value: value.residenceAddressAbroad ?? "",
    },
  ];

  return (
    <>
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <div className="text-sm font-medium">{row.label}</div>
          <div className="text-sm whitespace-pre-line">
            {row.value.trim() ? row.value : "-"}
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

function FormCheckboxRow({
  id,
  checked,
  disabled,
  label,
  description,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-4">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <div className="space-y-1 leading-none">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
