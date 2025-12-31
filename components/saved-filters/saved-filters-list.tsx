"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, Trash2, Search, Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState, useMemo } from "react"

interface SavedFilter {
  _id: Id<"savedFilters">
  name: string
  filterType: "individualProcesses" | "collectiveProcesses"
  filterCriteria: any
  createdAt: number
  updatedAt: number
}

interface SavedFiltersListProps {
  filterType: "individualProcesses" | "collectiveProcesses"
  onApplyFilter: (filterCriteria: any) => void
  onEditFilter?: (filter: SavedFilter) => void
}

export function SavedFiltersList({ filterType, onApplyFilter, onEditFilter }: SavedFiltersListProps) {
  const t = useTranslations("SavedFilters")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [filterToDelete, setFilterToDelete] = useState<Id<"savedFilters"> | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const savedFilters = useQuery(api.savedFilters.listByType, { filterType }) ?? []
  const deleteMutation = useMutation(api.savedFilters.remove)

  const dateLocale = locale === "pt" ? ptBR : enUS

  // Filter saved filters based on search query
  const filteredFilters = useMemo(() => {
    if (!searchQuery.trim()) return savedFilters

    const query = searchQuery.toLowerCase()
    return savedFilters.filter(filter =>
      filter.name.toLowerCase().includes(query)
    )
  }, [savedFilters, searchQuery])

  const handleApply = (filter: SavedFilter) => {
    onApplyFilter(filter.filterCriteria)
  }

  const handleEditClick = (e: React.MouseEvent, filter: SavedFilter) => {
    e.stopPropagation()
    onEditFilter?.(filter)
  }

  const handleDeleteClick = (e: React.MouseEvent, filterId: Id<"savedFilters">) => {
    e.stopPropagation()
    setFilterToDelete(filterId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!filterToDelete) return

    try {
      await deleteMutation({ id: filterToDelete })
      toast.success(t("success.filterDeleted"))
      setDeleteDialogOpen(false)
      setFilterToDelete(null)
    } catch (error) {
      console.error("Failed to delete filter:", error)
      toast.error(t("errors.deleteFailed"))
    }
  }

  if (savedFilters.length === 0) {
    return (
      <div className="text-center py-8 px-4 text-muted-foreground">
        <Filter className="mx-auto h-12 w-12 mb-2 opacity-20" />
        <p className="text-sm">{t("noSavedFilters")}</p>
      </div>
    )
  }

  return (
    <>
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Filters List */}
      {filteredFilters.length === 0 ? (
        <div className="text-center py-8 px-4 text-muted-foreground">
          <Filter className="mx-auto h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm">{t("noResultsFound")}</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {filteredFilters.map((filter) => (
          <div
            key={filter._id}
            className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
            onClick={() => handleApply(filter)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{filter.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(filter.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {onEditFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEditClick(e, filter)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteClick(e, filter._id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
