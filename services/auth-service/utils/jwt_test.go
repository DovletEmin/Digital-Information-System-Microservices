package utils

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGenerateToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	duration := time.Hour

	token, err := GenerateToken(userID, username, duration, secret)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestValidateToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	duration := time.Hour

	validToken, _ := GenerateToken(userID, username, duration, secret)
	expiredToken, _ := GenerateToken(userID, username, -time.Hour, secret)

	tests := []struct {
		name      string
		token     string
		secret    string
		wantError bool
	}{
		{
			name:      "Valid token",
			token:     validToken,
			secret:    secret,
			wantError: false,
		},
		{
			name:      "Expired token",
			token:     expiredToken,
			secret:    secret,
			wantError: true,
		},
		{
			name:      "Invalid secret",
			token:     validToken,
			secret:    "wrong-secret",
			wantError: true,
		},
		{
			name:      "Malformed token",
			token:     "invalid.token.here",
			secret:    secret,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := ValidateToken(tt.token, tt.secret)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, claims)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
				assert.Equal(t, userID, claims.UserID)
				assert.Equal(t, username, claims.Username)
			}
		})
	}
}
