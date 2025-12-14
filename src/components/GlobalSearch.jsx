import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Search, 
  Building2, 
  Home, 
  User, 
  Users, 
  FileText, 
  DollarSign,
  Loader,
  X
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim().length === 0) {
      setResults(null);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await base44.functions.invoke('globalSearch', { query });
        if (response.data.success) {
          setResults(response.data.data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleNavigate = (url) => {
    window.location.href = url;
    onClose();
  };

  const getTotalResults = () => {
    if (!results) return 0;
    return (
      results.associations.length +
      results.units.length +
      results.owners.length +
      results.tenants.length +
      results.customers.length +
      results.invoices.length
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-[#e3e4ed]">
          <Search className="w-5 h-5 text-[#5c5f7a]" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search associations, units, owners, tenants, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
          />
          {isLoading && <Loader className="w-4 h-4 text-[#5c5f7a] animate-spin" />}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#e3e4ed] rounded transition-colors"
          >
            <X className="w-4 h-4 text-[#5c5f7a]" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto p-2">
          {!query && (
            <div className="text-center py-12 text-[#5c5f7a]">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Start typing to search across all records</p>
              <p className="text-sm mt-2">Try searching for an association, unit, owner, or invoice</p>
            </div>
          )}

          {query && !isLoading && results && getTotalResults() === 0 && (
            <div className="text-center py-12 text-[#5c5f7a]">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results && getTotalResults() > 0 && (
            <div className="space-y-4">
              {/* Associations */}
              {results.associations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <Building2 className="w-3 h-3" />
                    Associations
                  </div>
                  <div className="space-y-1">
                    {results.associations.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('PropertyManagementAssociation') + `?id=${item.id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#414257]">{item.name}</p>
                            <p className="text-sm text-[#5c5f7a]">
                              {item.code && <span className="mr-2">Code: {item.code}</span>}
                              {item.city && item.state && <span>{item.city}, {item.state}</span>}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">{item.status}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Units */}
              {results.units.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <Home className="w-3 h-3" />
                    Units
                  </div>
                  <div className="space-y-1">
                    {results.units.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('PropertyManagementUnit') + `?id=${item.id}&associationId=${item.association_id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#414257]">Unit {item.unit_number}</p>
                            <p className="text-sm text-[#5c5f7a]">{item.association_name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{item.status}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Owners */}
              {results.owners.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <User className="w-3 h-3" />
                    Owners
                  </div>
                  <div className="space-y-1">
                    {results.owners.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('PropertyManagementAssociation') + `?id=${item.association_id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div>
                          <p className="font-medium text-[#414257]">
                            {item.is_company ? item.company_name : `${item.first_name} ${item.last_name}`}
                          </p>
                          <p className="text-sm text-[#5c5f7a]">
                            {item.association_name} - Unit {item.unit_number}
                            {item.email && <span className="ml-2">• {item.email}</span>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenants */}
              {results.tenants.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <Users className="w-3 h-3" />
                    Tenants
                  </div>
                  <div className="space-y-1">
                    {results.tenants.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('PropertyManagementAssociation') + `?id=${item.association_id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div>
                          <p className="font-medium text-[#414257]">
                            {item.first_name} {item.last_name}
                          </p>
                          <p className="text-sm text-[#5c5f7a]">
                            {item.association_name} - Unit {item.unit_number}
                            {item.email && <span className="ml-2">• {item.email}</span>}
                            {item.is_current && <Badge variant="outline" className="ml-2 text-xs">Current</Badge>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <DollarSign className="w-3 h-3" />
                    Customers
                  </div>
                  <div className="space-y-1">
                    {results.customers.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('InvoiceManagerCustomers'))}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div>
                          <p className="font-medium text-[#414257]">{item.name}</p>
                          <p className="text-sm text-[#5c5f7a]">
                            {item.email || item.phone || 'Customer'}
                            {item.type && <Badge variant="outline" className="ml-2 text-xs">{item.type}</Badge>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#5c5f7a] uppercase">
                    <FileText className="w-3 h-3" />
                    Invoices
                  </div>
                  <div className="space-y-1">
                    {results.invoices.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(createPageUrl('InvoiceManagerDetail') + `?id=${item.id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#e3e4ed] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#414257]">Invoice #{item.invoice_number}</p>
                            <p className="text-sm text-[#5c5f7a]">{item.customer_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#414257]">${(item.total || 0).toFixed(2)}</p>
                            <Badge variant="outline" className="text-xs">{item.status}</Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e3e4ed] p-3 bg-[#f8f8fb]">
          <div className="flex items-center justify-between text-xs text-[#5c5f7a]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-[#e3e4ed] rounded text-xs">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-[#e3e4ed] rounded text-xs">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-[#e3e4ed] rounded text-xs">ESC</kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}