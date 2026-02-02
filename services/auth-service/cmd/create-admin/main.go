package main

import (
	"auth-service/config"
	"auth-service/database"
	"auth-service/models"
	"auth-service/utils"
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"

	"golang.org/x/term"
)

func main() {
	fmt.Println("=== SMU Admin User Creator ===")
	fmt.Println()

	// Загрузка конфигурации
	cfg := config.LoadConfig()

	// Подключение к БД
	db := database.Connect(cfg)

	reader := bufio.NewReader(os.Stdin)

	// Ввод данных
	fmt.Print("Enter username: ")
	username, _ := reader.ReadString('\n')
	username = strings.TrimSpace(username)

	fmt.Print("Enter email: ")
	email, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)

	fmt.Print("Enter first name: ")
	firstName, _ := reader.ReadString('\n')
	firstName = strings.TrimSpace(firstName)

	fmt.Print("Enter last name: ")
	lastName, _ := reader.ReadString('\n')
	lastName = strings.TrimSpace(lastName)

	fmt.Print("Enter password: ")
	passwordBytes, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		log.Fatal("Failed to read password:", err)
	}
	password := string(passwordBytes)
	fmt.Println()

	// Проверка существующего пользователя
	var existingUser models.User
	if err := db.Where("username = ? OR email = ?", username, email).First(&existingUser).Error; err == nil {
		log.Fatal("User with this username or email already exists")
	}

	// Хэширование пароля
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Создание админ-пользователя
	user := models.User{
		Username:  username,
		Email:     email,
		Password:  hashedPassword,
		FirstName: firstName,
		LastName:  lastName,
		IsActive:  true,
		IsStaff:   true, // Админ
	}

	if err := db.Create(&user).Error; err != nil {
		log.Fatal("Failed to create user:", err)
	}

	fmt.Println()
	fmt.Println("✓ Admin user created successfully!")
	fmt.Printf("  ID: %d\n", user.ID)
	fmt.Printf("  Username: %s\n", user.Username)
	fmt.Printf("  Email: %s\n", user.Email)
	fmt.Printf("  Is Staff: %v\n", user.IsStaff)
	fmt.Println()
	fmt.Println("You can now login to the admin panel with these credentials.")
}
