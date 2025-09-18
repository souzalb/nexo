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

interface AdminNotificationEmailProps {
  requesterName: string;
  classCode: string;
  roomName: string;
}

export const AdminNotificationEmail = ({
  requesterName,
  classCode,
  roomName,
}: AdminNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Nova Solicitação de Reserva Recebida</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Nova Solicitação de Reserva</Heading>
        <Text style={paragraph}>Olá,</Text>
        <Text style={paragraph}>
          O utilizador <strong>{requesterName}</strong> enviou uma nova
          solicitação de reserva para a turma/evento{' '}
          <strong>&ldquo;{classCode}&rdquo;</strong> na sala{' '}
          <strong>{roomName}</strong>.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href="https://nexo.dev.br/requests">
            Ver Solicitações Pendentes
          </Button>
        </Section>
        <Text style={paragraph}>
          Por favor, acesse ao painel de administração para aprovar ou recusar
          esta solicitação.
        </Text>

        <Text style={paragraph}>
          Mensagem enviada automaticamente pelo © NEXO
        </Text>
      </Container>
    </Body>
  </Html>
);

// --- Estilos para o Email ---
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
  padding: '20px',
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
