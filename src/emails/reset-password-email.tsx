import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ResetPasswordEmailProps {
  userName: string;
  resetLink: string;
}

export const ResetPasswordEmail = ({
  userName,
  resetLink,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Redefinição de Senha - NEXO</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Redefinição de Senha</Heading>
        <Text style={paragraph}>Olá, {userName},</Text>
        <Text style={paragraph}>
          Recebemos uma solicitação para redefinir a senha da sua conta no NEXO.
          Clique no botão abaixo para criar uma nova senha:
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={resetLink}>
            Redefinir Minha Senha
          </Button>
        </Section>
        <Section style={warningSection}>
          <Text style={warningTitle}>⚠️ Importante:</Text>
          <Text style={warningText}>
            Este link expira em <strong>1 hora</strong>. Se você não solicitou a
            redefinição de senha, ignore este email — sua conta permanece
            segura.
          </Text>
        </Section>
        <Text style={paragraph}>
          Mensagem enviada automaticamente pelo © NEXO
        </Text>
      </Container>
    </Body>
  </Html>
);

// --- Estilos ---
const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' };
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
};
const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  padding: '0 20px',
};
const paragraph = {
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#525f7f',
  padding: '0 20px',
};
const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
};
const button = {
  backgroundColor: '#1a1a2e',
  color: '#fff',
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  borderRadius: '4px',
  fontWeight: '600',
  marginLeft: '20px',
  marginRight: '20px',
};
const warningSection = {
  borderLeft: '4px solid #e2a308',
  paddingLeft: '16px',
  margin: '20px 20px',
};
const warningTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#484848',
  margin: '0 0 4px 0',
};
const warningText = {
  fontSize: '14px',
  color: '#525f7f',
  margin: '0',
};
