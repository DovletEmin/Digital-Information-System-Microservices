package handlers

import (
	"bytes"
	"io"
	"strings"
	"testing"
)

// TestDetectMIME_JPEG verifies that JPEG magic bytes are detected correctly.
func TestDetectMIME_JPEG(t *testing.T) {
	// JPEG magic bytes: FF D8 FF
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00}
	mimeType, _, err := detectMIME(bytes.NewReader(jpegHeader))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mimeType != "image/jpeg" {
		t.Errorf("expected image/jpeg, got %s", mimeType)
	}
}

// TestDetectMIME_PNG verifies PNG magic bytes.
func TestDetectMIME_PNG(t *testing.T) {
	pngHeader := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D}
	mimeType, _, err := detectMIME(bytes.NewReader(pngHeader))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mimeType != "image/png" {
		t.Errorf("expected image/png, got %s", mimeType)
	}
}

// TestDetectMIME_PDF verifies PDF magic bytes.
func TestDetectMIME_PDF(t *testing.T) {
	pdfContent := []byte("%PDF-1.4 test content for MIME detection")
	mimeType, _, err := detectMIME(bytes.NewReader(pdfContent))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mimeType != "application/pdf" {
		t.Errorf("expected application/pdf, got %s", mimeType)
	}
}

// TestDetectMIME_StripParameters verifies that charset and other parameters are stripped.
func TestDetectMIME_StripParameters(t *testing.T) {
	// Plain text returns "text/plain; charset=utf-8" from http.DetectContentType.
	content := []byte("Hello, this is plain text content without any binary magic bytes.")
	mimeType, _, err := detectMIME(bytes.NewReader(content))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(mimeType, ";") {
		t.Errorf("MIME type should not contain parameters, got %s", mimeType)
	}
}

// TestDetectMIME_ReturnsAllBytes verifies the combined reader returns the full original content.
func TestDetectMIME_ReturnsAllBytes(t *testing.T) {
	// Use 600 bytes — larger than the 512-byte probe window.
	data := make([]byte, 600)
	for i := range data {
		data[i] = byte(i % 256)
	}

	_, combinedReader, err := detectMIME(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	result, err := io.ReadAll(combinedReader)
	if err != nil {
		t.Fatalf("read error: %v", err)
	}
	if len(result) != len(data) {
		t.Errorf("expected %d bytes from combined reader, got %d", len(data), len(result))
	}
	if !bytes.Equal(result, data) {
		t.Error("combined reader returned different bytes than the original")
	}
}

// TestDetectMIME_SmallFile verifies that files smaller than 512 bytes still work.
func TestDetectMIME_SmallFile(t *testing.T) {
	jpegHeader := []byte{0xFF, 0xD8, 0xFF}
	mimeType, combinedReader, err := detectMIME(bytes.NewReader(jpegHeader))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mimeType == "" {
		t.Error("MIME type should not be empty for a short JPEG header")
	}

	result, err := io.ReadAll(combinedReader)
	if err != nil {
		t.Fatalf("read error: %v", err)
	}
	if len(result) != len(jpegHeader) {
		t.Errorf("expected %d bytes, got %d", len(jpegHeader), len(result))
	}
}

// TestAllowedMIMETypes verifies that known-good MIME types are in the whitelist.
func TestAllowedMIMETypes(t *testing.T) {
	expected := []string{
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
		"application/pdf",
		"application/epub+zip",
	}
	for _, mime := range expected {
		if !allowedMIMETypes[mime] {
			t.Errorf("MIME type %q should be in the whitelist", mime)
		}
	}
}

// TestAllowedMIMETypes_BlocksUnknown verifies that dangerous types are not allowed.
func TestAllowedMIMETypes_BlocksUnknown(t *testing.T) {
	dangerous := []string{
		"application/x-executable",
		"application/x-sh",
		"text/html",
		"application/javascript",
	}
	for _, mime := range dangerous {
		if allowedMIMETypes[mime] {
			t.Errorf("MIME type %q must NOT be in the whitelist", mime)
		}
	}
}
