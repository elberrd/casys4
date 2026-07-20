"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { formatResidenceDuration } from "@/lib/utils/residence-duration";
import { getConsularPostsForCountry } from "@/lib/data/brazil-consular-posts";

/**
 * Where the visa will be received and (when abroad) the candidate's current
 * foreign residence details.
 */
export interface ResidenceValue {
  visaReceiptLocation?: "brazil" | "abroad";
  residenceCountryCode?: string;
  residenceCountryName?: string;
  residenceStateCode?: string;
  residenceCity?: string;
  residenceSince?: string;
  residenceAddressAbroad?: string;
  /** Brazilian consular post serving the residence country (where the visa is collected). */
  consularPost?: string;
}

export interface ResidenceSelectProps {
  value: ResidenceValue;
  /** When provided, the legal framework fixes the destination (read-only). */
  receiptLocation?: "brazil" | "abroad";
  onChange: (value: ResidenceValue) => void;
  disabled?: boolean;
}

/** Minimal shapes from the `country-state-city` package we rely on. */
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

/**
 * Foreign-residence selector used in the request wizard (and the process card).
 * Shows where the visa will be received and, when abroad, a
 * cascading Country -> State -> City selection plus a "living since" date, a
 * computed duration line, and a free-form address.
 *
 * Performance notes:
 * - Countries come from the Convex `countries` table (a single cached read,
 *   SKIPPED entirely while "Brazil" is selected) — not from the multi-MB
 *   country-state-city bundle.
 * - States/cities come from country-state-city, imported lazily and scoped to
 *   the selected country/state so the lists stay small (no "all cities of a
 *   country" mega-lists). Each cascading select shows a loading state.
 */
export function ResidenceSelect({
  value,
  receiptLocation,
  onChange,
  disabled = false,
}: ResidenceSelectProps) {
  const t = useTranslations("ProcessRequests");

  const effectiveReceiptLocation = receiptLocation ?? value.visaReceiptLocation;
  const isAbroad = effectiveReceiptLocation === "abroad";

  // Single cached country read; skipped while not abroad to avoid wasted reads.
  const dbCountries = useQuery(api.countries.list, isAbroad ? {} : "skip");

  const [states, setStates] = React.useState<StateOption[]>([]);
  const [statesLoaded, setStatesLoaded] = React.useState(false);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [cities, setCities] = React.useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);

  const countryCode = value.residenceCountryCode;
  const stateCode = value.residenceStateCode;

  const countries: CountryOption[] = React.useMemo(() => {
    // Dedupe by ISO2 code (the DB can contain duplicate rows for a country,
    // e.g. "BRASIL" and "Brazil" both with code "BR" — which would otherwise
    // produce duplicate React keys). Prefer the row that carries an iso3 code.
    const byCode = new Map<
      string,
      { isoCode: string; name: string; iso3?: string }
    >();
    for (const c of dbCountries ?? []) {
      const iso = c.code;
      if (!iso) continue;
      const existing = byCode.get(iso);
      if (!existing || (!existing.iso3 && c.iso3)) {
        byCode.set(iso, { isoCode: iso, name: c.name, iso3: c.iso3 });
      }
    }
    return Array.from(byCode.values())
      .map(({ isoCode, name }) => ({ isoCode, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCountries]);
  const loadingCountries = isAbroad && dbCountries === undefined;

  // Lazily load the states for the selected country.
  React.useEffect(() => {
    if (!isAbroad || !countryCode) {
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
  }, [isAbroad, countryCode]);

  // Lazily load cities: scoped to the selected state, or (for countries with no
  // states) to the country directly. Waits until states have been resolved.
  React.useEffect(() => {
    if (!isAbroad || !countryCode || !statesLoaded) {
      setCities([]);
      return;
    }
    const hasStates = states.length > 0;
    if (hasStates && !stateCode) {
      // Wait for the user to pick a state before loading its cities.
      setCities([]);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);

    import("country-state-city")
      .then(({ City }) => {
        if (cancelled) return;
        const list =
          hasStates && stateCode
            ? (City.getCitiesOfState(countryCode, stateCode) ?? [])
            : (City.getCitiesOfCountry(countryCode) ?? []);
        setCities(list.map((c) => ({ name: c.name })));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load city list:", error);
        setCities([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCities(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAbroad, countryCode, stateCode, statesLoaded, states.length]);

  const merge = React.useCallback(
    (patch: Partial<ResidenceValue>) => {
      onChange({
        ...value,
        ...(receiptLocation
          ? { visaReceiptLocation: receiptLocation }
          : undefined),
        ...patch,
      });
    },
    [onChange, receiptLocation, value],
  );

  const handleLocationChange = (next: "brazil" | "abroad") => {
    if (next === "brazil") {
      onChange({
        ...value,
        visaReceiptLocation: "brazil",
        residenceCountryCode: undefined,
        residenceCountryName: undefined,
        residenceStateCode: undefined,
        residenceCity: undefined,
        residenceSince: undefined,
        residenceAddressAbroad: undefined,
        consularPost: undefined,
      });
      return;
    }
    merge({ visaReceiptLocation: "abroad" });
  };

  const handleCountryChange = (isoCode: string | undefined) => {
    const selected = isoCode
      ? countries.find((c) => c.isoCode === isoCode)
      : undefined;

    // Changing the country invalidates state, city and the consular post.
    merge({
      residenceCountryCode: isoCode,
      residenceCountryName: selected?.name,
      residenceStateCode: undefined,
      residenceCity: undefined,
      consularPost: undefined,
    });
  };

  const handleStateChange = (stateIso: string | undefined) => {
    // Changing the state invalidates the previously selected city.
    merge({ residenceStateCode: stateIso, residenceCity: undefined });
  };

  const handleCityChange = (cityName: string | undefined) => {
    merge({ residenceCity: cityName });
  };

  const countryOptions: ComboboxOption[] = React.useMemo(
    () =>
      countries.map((c) => ({
        value: c.isoCode,
        label: c.name,
      })),
    [countries],
  );

  const stateOptions: ComboboxOption[] = React.useMemo(
    () => states.map((s) => ({ value: s.isoCode, label: s.name })),
    [states],
  );

  // Whether to surface the state select (some countries have no states).
  const showStateSelect = loadingStates || stateOptions.length > 0;
  const cityDisabled =
    disabled || !countryCode || (showStateSelect && !stateCode);

  const cityOptions: ComboboxOption[] = React.useMemo(() => {
    const seen = new Set<string>();
    const options: ComboboxOption[] = [];
    for (const c of cities) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      options.push({ value: c.name, label: c.name });
    }
    return options;
  }, [cities]);

  // Brazilian consular posts serving the selected residence country.
  const consularPostOptions: ComboboxOption[] = React.useMemo(
    () =>
      getConsularPostsForCountry(value.residenceCountryCode).map((post) => ({
        value: post,
        label: post,
      })),
    [value.residenceCountryCode],
  );

  const durationLabel = value.residenceSince
    ? formatResidenceDuration(
        value.residenceSince,
        // next-intl's `t` is strongly typed per-namespace; the helper expects a
        // loose translator signature, so we adapt it here.
        (key, vars) => t(key as never, vars as never),
      )
    : "";

  return (
    <div className="space-y-4">
      {/* Where will the visa be received? */}
      <div className="space-y-2">
        <Label>{t("whereWillReceiveVisa")}</Label>
        {receiptLocation ? (
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium">{t(receiptLocation)}</p>
            <p className="text-xs text-muted-foreground">
              {t("receiptLocationDeterminedByFramework")}
            </p>
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label={t("whereWillReceiveVisa")}
            className="grid grid-cols-2 gap-2"
          >
            <Button
              type="button"
              role="radio"
              aria-checked={value.visaReceiptLocation === "brazil"}
              variant={
                value.visaReceiptLocation === "brazil" ? "default" : "outline"
              }
              disabled={disabled}
              onClick={() => handleLocationChange("brazil")}
              className="w-full"
            >
              {t("brazil")}
            </Button>
            <Button
              type="button"
              role="radio"
              aria-checked={value.visaReceiptLocation === "abroad"}
              variant={
                value.visaReceiptLocation === "abroad" ? "default" : "outline"
              }
              disabled={disabled}
              onClick={() => handleLocationChange("abroad")}
              className="w-full"
            >
              {t("abroad")}
            </Button>
          </div>
        )}
      </div>

      {/* Abroad-only residence details */}
      {isAbroad && (
        <div className="space-y-4 rounded-lg border p-4">
          {/* Country */}
          <div className="space-y-2">
            <Label>{t("residenceCountry")}</Label>
            <Combobox
              options={countryOptions}
              value={value.residenceCountryCode || undefined}
              onValueChange={handleCountryChange}
              placeholder={t("selectCountry")}
              searchPlaceholder={t("searchCountry")}
              emptyText={t("noCountriesFound")}
              loading={loadingCountries}
              loadingText={t("loadingCountries")}
              disabled={disabled}
            />
          </div>

          {/* State / province (cascading; hidden for countries that have none) */}
          {showStateSelect && (
            <div className="space-y-2">
              <Label>{t("residenceState")}</Label>
              <Combobox
                options={stateOptions}
                value={value.residenceStateCode || undefined}
                onValueChange={handleStateChange}
                placeholder={t("selectState")}
                searchPlaceholder={t("searchState")}
                emptyText={t("noStatesFound")}
                loading={loadingStates}
                loadingText={t("loadingStates")}
                disabled={disabled || !value.residenceCountryCode}
              />
            </div>
          )}

          {/* City (cascading) */}
          <div className="space-y-2">
            <Label>{t("residenceCity")}</Label>
            <Combobox
              options={cityOptions}
              value={value.residenceCity || undefined}
              onValueChange={handleCityChange}
              placeholder={t("selectCity")}
              searchPlaceholder={t("searchCity")}
              emptyText={t("noCitiesFound")}
              loading={loadingCities}
              loadingText={t("loadingCities")}
              disabled={cityDisabled}
            />
          </div>

          {/* Brazilian consular post (where the visa will be collected) */}
          <div className="space-y-2">
            <Label>{t("consularPost")}</Label>
            {consularPostOptions.length > 0 ? (
              <Combobox
                options={consularPostOptions}
                value={value.consularPost || undefined}
                onValueChange={(next) => merge({ consularPost: next })}
                placeholder={t("selectConsularPost")}
                searchPlaceholder={t("searchConsularPost")}
                emptyText={t("noConsularPostsFound")}
                disabled={disabled || !value.residenceCountryCode}
              />
            ) : (
              <Input
                value={value.consularPost || ""}
                onChange={(e) => merge({ consularPost: e.target.value })}
                placeholder={t("consularPostPlaceholder")}
                disabled={disabled || !value.residenceCountryCode}
              />
            )}
            {value.residenceCountryCode && consularPostOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("noConsularPostsForCountry")}
              </p>
            )}
          </div>

          {/* Living since */}
          <div className="space-y-2">
            <Label>{t("residenceSince")}</Label>
            <DatePicker
              value={value.residenceSince || undefined}
              onChange={(next) => merge({ residenceSince: next || undefined })}
              disabled={disabled}
              showYearMonthDropdowns
            />
            {durationLabel && (
              <p className="text-sm text-muted-foreground">{durationLabel}</p>
            )}
          </div>

          {/* Address abroad */}
          <div className="space-y-2">
            <Label htmlFor="residence-address-abroad">
              {t("residenceAddressAbroad")}
            </Label>
            <Textarea
              id="residence-address-abroad"
              value={value.residenceAddressAbroad || ""}
              onChange={(e) =>
                merge({ residenceAddressAbroad: e.target.value })
              }
              placeholder={t("residenceAddressAbroadPlaceholder")}
              rows={3}
              disabled={disabled}
              className={cn("resize-none")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
