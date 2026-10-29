fruits = ['apple', 'banana', 'cherry']
print('After append("orange"):', fruits)

fruits = ['apple', 'banana', 'cherry', 'orange']
fruits.clear()

fruits = ['apple', 'banana', 'cherry', 'orange']
x = fruits.copy()
print('Aftercopy():', x)

fruits = ['apple', 'banana', 'cherry', 'orange']
x = fruits.count('cherry')
print('Count of "cherry":', x)

fruits = ['apple', 'banana', 'cherry']
cars = ['Ford', 'BMW', 'Volvo']

fruits.extend(cars)
print(fruits)

fruits = ['apple', 'banana', 'cherry']
x = fruits.index("cherry")
print(x)

fruits = ['apple', 'banana', 'cherry']
fruits.insert(1, "orange")
print(fruits)

fruits = ['apple', 'banana', 'cherry']
fruits.pop(1)
print(fruits)

fruits = ['apple', 'banana', 'cherry']
fruits.remove("banana")
print(fruits)

