import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageCategory } from './dto/upload-ticket.dto';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  describe('generateUploadTicket', () => {
    it('doit générer un ticket d’upload sécurisé pour un document KYC (mode Standalone)', () => {
      const ticket = service.generateUploadTicket('user-test-123', {
        filename: 'carte_identite.jpg',
        fileType: 'image/jpeg',
        fileSize: 2048576, // 2 Mo
        category: StorageCategory.KYC_DOCUMENT,
      });

      expect(ticket).toBeDefined();
      expect(ticket.ticketId).toBeDefined();
      expect(ticket.provider).toBe('SECURE_STORAGE');
      expect(ticket.uploadUrl).toContain('/api/v1/storage/upload/');
      expect(ticket.signedParams.token).toBeDefined();
      expect(ticket.isPrivate).toBe(true);
    });

    it('doit marquer un média de Live Shopping comme public', () => {
      const ticket = service.generateUploadTicket('vendor-test-456', {
        filename: 'live_presentation.mp4',
        fileType: 'video/mp4',
        fileSize: 15485760, // 15 Mo
        category: StorageCategory.STREAM_MEDIA,
      });

      expect(ticket.isPrivate).toBe(false);
      expect(ticket.uploadUrl).toBeDefined();
    });

    it('doit rejeter un type MIME non autorisé pour la catégorie', () => {
      expect(() =>
        service.generateUploadTicket('user-test-123', {
          filename: 'script_malveillant.exe',
          fileType: 'application/x-msdownload',
          fileSize: 1024,
          category: StorageCategory.KYC_DOCUMENT,
        }),
      ).toThrow(BadRequestException);
    });

    it('doit rejeter un document dépassant la taille maximale autorisée (10 Mo)', () => {
      expect(() =>
        service.generateUploadTicket('user-test-123', {
          filename: 'gros_fichier.pdf',
          fileType: 'application/pdf',
          fileSize: 15000000, // 15 Mo > 10 Mo
          category: StorageCategory.KYC_DOCUMENT,
        }),
      ).toThrow(BadRequestException);
    });

    it('doit générer les paramètres signés Cloudinary si les variables d’environnement sont définies', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'openboutik-cloud';
      process.env.CLOUDINARY_API_KEY = '1234567890';
      process.env.CLOUDINARY_API_SECRET = 'secret_test_key';

      try {
        const ticket = service.generateUploadTicket('vendor-test-456', {
          filename: 'photo_produit.png',
          fileType: 'image/png',
          fileSize: 1048576,
          category: StorageCategory.PRODUCT_IMAGE,
        });

        expect(ticket.provider).toBe('CLOUDINARY');
        expect(ticket.uploadUrl).toContain('api.cloudinary.com');
        expect(ticket.signedParams.api_key).toBe('1234567890');
        expect(ticket.signedParams.signature).toBeDefined();
      } finally {
        delete process.env.CLOUDINARY_CLOUD_NAME;
        delete process.env.CLOUDINARY_API_KEY;
        delete process.env.CLOUDINARY_API_SECRET;
      }
    });
  });

  describe('generateExpiringViewUrl', () => {
    it('doit autoriser le Super-Admin à obtenir un lien de consultation temporaire', () => {
      const url = 'https://openboutik-api.onrender.com/storage/files/cni_privee.pdf';
      const secureUrl = service.generateExpiringViewUrl(url, 'SUPER_ADMIN');

      expect(secureUrl).toContain('token=');
      expect(secureUrl).toContain('expires=');
    });

    it('doit interdire l’accès éphémère aux rôles non autorisés', () => {
      const url = 'https://openboutik-api.onrender.com/storage/files/cni_privee.pdf';
      expect(() => service.generateExpiringViewUrl(url, 'CLIENT')).toThrow(BadRequestException);
      expect(() => service.generateExpiringViewUrl(url, 'VENDOR')).toThrow(BadRequestException);
    });
  });
});
