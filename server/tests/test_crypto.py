from app.core.crypto import encrypt_secret, decrypt_secret


def test_encrypt_decrypt_round_trip():
    plaintext = "sk-test-12345"
    ciphertext = encrypt_secret(plaintext)
    assert ciphertext != plaintext
    assert decrypt_secret(ciphertext) == plaintext


def test_different_plaintexts_produce_different_ciphertexts():
    assert encrypt_secret("secret-a") != encrypt_secret("secret-b")
