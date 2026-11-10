import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const About = () => {
    return (
        <MainLayout>
            <div className="container mx-auto p-6 max-w-4xl">
                <h1 className="text-3xl font-bold text-foreground mb-6">Sobre o Sistema</h1>

                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                            <ShieldAlert className="h-6 w-6" />
                            Aviso Legal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-justify text-muted-foreground leading-relaxed">
                        <p className="font-medium text-foreground">
                            Este software destina-se exclusivamente a controlo interno de vendas, não sendo um sistema de faturação certificado nem substituindo qualquer obrigação fiscal legal.
                        </p>
                        <p>
                            O software não emite faturas, faturas-recibo ou documentos fiscalmente relevantes, nem comunica com a Autoridade Tributária.
                        </p>
                        <p>
                            O autor não se responsabiliza pela utilização do software para fins fiscais, comerciais externos ou em desconformidade com a legislação em vigor.
                        </p>
                    </CardContent>
                </Card>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                    <p>LocalTill POS - Versão 1.0.0</p>
                    <p>© {new Date().getFullYear()} LocalTill. Todos os direitos reservados.</p>
                </div>
            </div>
        </MainLayout>
    );
};

export default About;
