"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export const Drawer = Sheet
export const DrawerHeader = SheetHeader
export const DrawerTitle = SheetTitle
export const DrawerDescription = SheetDescription
export const DrawerFooter = SheetFooter

export const DrawerContent = React.forwardRef<React.ElementRef<typeof SheetContent>, React.ComponentPropsWithoutRef<typeof SheetContent>>(
  ({ className, ...props }, ref) => <SheetContent ref={ref} side="right" className={cn("flex h-dvh w-full flex-col overflow-y-auto border-l sm:max-w-xl", className)} {...props}/>,
)
DrawerContent.displayName = "DrawerContent"
