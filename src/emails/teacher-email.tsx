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

interface UserStatusEmailProps {
  userName: string;
  classCode: string;
  status: 'aprovada' | 'recusada';
  refusalReason?: string;
}

export const UserStatusEmail = ({
  userName,
  classCode,
  status,
  refusalReason,
}: UserStatusEmailProps) => (
  <Html>
    <Head />
    <Preview>Atualização sobre a sua Solicitação de Reserva</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>
          A sua solicitação foi{' '}
          {status === 'aprovada' ? 'aprovada!' : 'recusada!'}
        </Heading>
        <Text style={paragraph}>Olá, {userName},</Text>
        <Text style={paragraph}>
          Temos uma atualização sobre a sua solicitação de reserva para a
          turma/evento <strong>&ldquo;{classCode}&rdquo;</strong>. A sua
          solicitação foi <strong>{status}</strong>.
        </Text>
        {status === 'recusada' && refusalReason && (
          <Section style={reasonSection}>
            <Text style={reasonTitle}>Motivo da Recusa:</Text>
            <Text style={reasonText}>&ldquo;{refusalReason}&rdquo;</Text>
          </Section>
        )}
        {status === 'aprovada' && (
          <Text style={paragraph}>
            As suas reservas já estão visíveis no calendário principal.
          </Text>
        )}
        <Section style={btnContainer}>
          <Button
            style={button}
            href={`${process.env.NEXTAUTH_URL}/my-bookings`}
          >
            Ver As Minhas Reservas
          </Button>
        </Section>

        <Text style={paragraph}>
          Mensagem enviada automaticamente pelo © NEXO
        </Text>
      </Container>
    </Body>
  </Html>
);

// --- (Estilos como no outro email) ---
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
  backgroundColor: 'blue',
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

const reasonSection = {
  borderLeft: '4px solid #e53e3e',
  paddingLeft: '20px',
  margin: '20px 0',
};
const reasonTitle = { fontSize: '14px', fontWeight: 'bold', color: '#484848' };
const reasonText = { fontSize: '15px', fontStyle: 'italic', color: '#525f7f' };
