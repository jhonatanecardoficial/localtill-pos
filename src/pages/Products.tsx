import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Package, Upload, X, RefreshCw, ImagePlus } from 'lucide-react';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number;
  unit: string;
  is_active: boolean;
  barcode: string | null;
  image_url: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const productSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório').max(50),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
  description: z.string().max(500).optional(),
  sale_price: z.number().min(0, 'Preço deve ser maior que zero'),
  cost_price: z.number().min(0).optional(),
  unit: z.string().default('un'),
  barcode: z.string().max(50).optional(),
});

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showImportResult, setShowImportResult] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    sale_price: '',
    cost_price: '',
    unit: 'un',
    barcode: '',
    category_id: 'no_category',
  });
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/categories')
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    setImportLoading(true);
    try {
      const result = await api.post<any>('/products/bulk-import-images', {});
      setImportResult(result);
      setShowImportResult(true);
      if (result.matched > 0) {
        toast.success(`${result.matched} imagens importadas!`);
        fetchData();
      } else {
        toast.warning('Nenhuma imagem correspondeu a um SKU cadastrado.');
      }
    } catch (error: any) {
      const msg = error?.error || error?.message || 'Erro ao importar imagens';
      const detail = error?.detail || '';
      toast.error(`${msg}${detail ? '\n' + detail : ''}`);
    } finally {
      setImportLoading(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await api.post<{ url: string }>('/upload', formData);

      return response.url;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        toast.error('Imagem deve ter no máximo 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validar dados
      const validatedData = productSchema.parse({
        sku: formData.sku,
        name: formData.name,
        description: formData.description.trim() || undefined,
        sale_price: parseFloat(formData.sale_price),
        cost_price: formData.cost_price && formData.cost_price.trim() !== '' ? parseFloat(formData.cost_price) : undefined,
        unit: formData.unit,
        barcode: formData.barcode.trim() || undefined,
      });

      // Validar SKU único (check básico no frontend, backend tbm valida)
      const existingSku = products.find(p => p.sku === validatedData.sku && p.id !== editingProduct?.id);
      if (existingSku) {
        toast.error('Já existe um produto com este SKU');
        return;
      }

      let imageUrl = editingProduct?.image_url || null;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const productData = {
        sku: validatedData.sku,
        name: validatedData.name,
        description: validatedData.description || null,
        sale_price: validatedData.sale_price,
        cost_price: validatedData.cost_price || null,
        unit: validatedData.unit,
        barcode: validatedData.barcode || null,
        image_url: imageUrl,
        category_id: formData.category_id && formData.category_id !== 'no_category' ? formData.category_id : null,
        is_active: true
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, productData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await api.post('/products', productData);
        toast.success('Produto criado com sucesso!');
      }

      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error saving product:', error);
        toast.error('Erro ao salvar produto');
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      sale_price: product.sale_price.toString(),
      cost_price: product.cost_price ? product.cost_price.toString() : '',
      unit: product.unit,
      barcode: product.barcode || '',
      category_id: product.category_id || 'no_category',
    });
    setImagePreview(product.image_url ? getImageUrl(product.image_url) : null);
    setImageFile(null);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Produto excluído com sucesso!');
      fetchData(); // Recarregar lista
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      sale_price: '',
      cost_price: '',
      unit: 'un',
      barcode: '',
      category_id: 'no_category',
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground mt-1">Gerencie seu catálogo de produtos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} title="Recarregar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkImport}
              disabled={importLoading}
              className="gap-2"
              title="Importar imagens da pasta 'imagens' por SKU"
            >
              <ImagePlus className="w-4 h-4" />
              {importLoading ? 'Importando...' : 'Importar Imagens'}
            </Button>
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente buscar com outros termos' : 'Comece criando seu primeiro produto'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Produto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="shadow-card transition-base hover:shadow-lg">
                <CardContent className="p-6">
                  {product.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-square">
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${product.is_active
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-sm text-muted-foreground">
                      Preço: <span className="font-semibold text-foreground">
                        {formatCurrency(product.sale_price)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unidade: <span className="text-foreground">{product.unit}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do produto abaixo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imagePreview.startsWith('data:') ? imagePreview : getImageUrl(imagePreview)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG ou WEBP (máx. 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_category">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Preço Venda *</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Preço Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Enviando...' : editingProduct ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={showImportResult} onOpenChange={setShowImportResult}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
            <DialogDescription>
              {importResult?.message}
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">{importResult.matched}</div>
                  <div className="text-muted-foreground">Vinculadas</div>
                </div>
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-warning">{importResult.notMatched?.length || 0}</div>
                  <div className="text-muted-foreground">Sem correspondência</div>
                </div>
              </div>

              {importResult.updated?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-success">✅ SKUs atualizados:</h4>
                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {importResult.updated.map((sku: string, i: number) => (
                      <span key={i} className="inline-block bg-success/10 text-success px-2 py-0.5 rounded mr-1 mb-1">{sku}</span>
                    ))}
                  </div>
                </div>
              )}

              {importResult.notMatched?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-warning">⚠️ Sem produto correspondente:</h4>
                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {importResult.notMatched.map((sku: string, i: number) => (
                      <span key={i} className="inline-block bg-warning/10 text-warning px-2 py-0.5 rounded mr-1 mb-1">{sku}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowImportResult(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Products;
