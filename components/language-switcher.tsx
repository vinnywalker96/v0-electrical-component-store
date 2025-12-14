"use client"

import { Globe } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentLanguage, setLanguage } from '@/lib/store/languageSlice';

export function LanguageSwitcher() {
  const language = useSelector(selectCurrentLanguage);
  const dispatch = useDispatch();

  return (
    <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
      <SelectTrigger className="w-32 gap-2">
        <Globe className="w-4 h-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="pt">Português</SelectItem>
      </SelectContent>
    </Select>
  )
}
