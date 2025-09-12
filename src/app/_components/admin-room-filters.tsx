'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { IconFilterX } from '@tabler/icons-react';
import * as React from 'react';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AdminRoomFiltersProps {
  allLocations: string[];
  allTypes: string[];
}

export function AdminRoomFilters({
  allLocations,
  allTypes,
}: AdminRoomFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (!value || value === 'all') {
      current.delete(key);
    } else {
      current.set(key, value);
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <Card className="p-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <span className="hidden text-sm font-semibold text-gray-700 sm:block dark:text-gray-100">
            Filtros:
          </span>
          <Input
            placeholder="Pesquisar por nome..."
            defaultValue={searchParams.get('name') || ''}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            className="lg:col-span-2"
          />
          <Select
            value={searchParams.get('location') || 'all'}
            onValueChange={(value) => handleFilterChange('location', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Bloco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Blocos</SelectItem>
              {allLocations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get('type') || 'all'}
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de Sala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {allTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Capacidade Mínima"
            type="number"
            defaultValue={searchParams.get('capacity') || ''}
            onChange={(e) => handleFilterChange('capacity', e.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center gap-4 border-t pt-4">
          <span className="hidden text-sm font-semibold text-nowrap text-gray-700 sm:block dark:text-gray-100">
            Filtros por disponibilidade:
          </span>
          <Select
            value={searchParams.get('availabilityPeriod') || 'all'}
            onValueChange={(value) =>
              handleFilterChange('availabilityPeriod', value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer Período</SelectItem>
              <SelectItem value="MANHA">Manhã (07:30 - 11:30)</SelectItem>
              <SelectItem value="TARDE">Tarde (13:00 - 17:00)</SelectItem>
              <SelectItem value="NOITE">Noite (18:30 - 21:30)</SelectItem>
            </SelectContent>
          </Select>
          <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
            Data de início:
          </h3>
          <Input
            type="date"
            title="Data de Início da Disponibilidade"
            defaultValue={searchParams.get('availabilityStartDate') || ''}
            onChange={(e) =>
              handleFilterChange('availabilityStartDate', e.target.value)
            }
          />
          <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
            Data de término:
          </h3>
          <Input
            type="date"
            title="Data de Término da Disponibilidade"
            defaultValue={searchParams.get('availabilityEndDate') || ''}
            onChange={(e) =>
              handleFilterChange('availabilityEndDate', e.target.value)
            }
          />
          <Button
            variant="secondary"
            onClick={clearFilters}
            className="mt-2 text-red-500 hover:bg-red-50 hover:text-red-600 sm:mt-0"
          >
            <IconFilterX />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
